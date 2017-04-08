/* jshint globalstrict: true */
'use strict';

/**
 * 作用域引用类型
 * 
 */
function Scope(){
   this.$$watchers=[];   //监听器列表
   this.$$lastDirtyWatch=null;  //上一个脏的监视器
   this.$$asyncQueue=[];   //异步队列，函数会在当前脏检查循环中运行
   this.$$applyAsyncQueue=[];   //异步执行队列，函数会延时执行
   this.$$applyAsyncId=null;   //异步执行定时器的序号
   this.$$postDigestQueue=[];   //脏检查循环后运行队列
   this.phase=null;   //当前状态，包括$digest和$apply
   this.$$children=[];   //记录其子作用域列表
}

Scope.prototype={
    /**
     * 添加监听器
     * watchFn 监控函数，返回监控对象,监控函数应该是没有副作用的，即不会改变其他数据
     * listenFn 监听函数（可选），监控对象发生变化时执行的操作
     * valueEq 是否监控值的变更（可选）
     */
    $watch: function(watchFn,listenFn,valueEq){
        var watcher={
            watchFn: watchFn,
            listenFn: listenFn || function(){},   //监听函数是可选的
            last: initWatchVal,   //将旧值初始化为独一无二的引用类型，保证数据为undefined时也会触发监听函数
            valueEq: !!valueEq
        };
        this.$$watchers.unshift(watcher);
        this.$$lastDirtyWatch=null;   //当添加新的监视器时，禁止脏检查优化，为了保证新的监视器也会运行

        var self=this;
        return function(){
            var index=self.$$watchers.indexOf(watcher);
            if(index>=0){
                self.$$watchers.splice(index,1);
                self.$$lastDirtyWatch=null;   //禁止进行优化，因为可能销毁前一个监视器，导致脏检查循环结束
            }
        };
    },

    /**
     * 脏检查一次
     * 遍历作用域中监听器列表中所有的元素
     * return <Boolean> 是否存在监控数据修改
     */
    $$digestOnce: function(){
        var self=this;   //保存当前scope作用域
        var dirty;   //是否存在监控数据修改，调用过监听器函数，因为监听器函数也有可能改变其他监控值
        var continueLoop=true;
        this.$$everyScope(function(scope){
        var newValue,oldValue;
        _.forEachRight(scope.$$watchers,function(item){
            try{
            if(item){    //确保删除一系列监视器时，当前监视器还存在
            //从监控函数获取新值
            newValue=item.watchFn(scope);
            //读取保存的旧值
            oldValue=item.last;

            if(!scope.$$isEqual(newValue,oldValue,item.valueEq)){
                self.$$lastDirtyWatch=item;
                item.listenFn(newValue,
                    oldValue===initWatchVal? newValue:oldValue,
                    scope);

                //如果值比较则进行深入拷贝
                item.last=(item.valueEq? _.cloneDeep(newValue) : newValue);
                dirty=true;
            }
            else if(item===self.$$lastDirtyWatch){
                continueLoop=false;
                return false;
            }
            }
        }
        catch(error){
            console.log(error);
        }
    });
    return continueLoop;
    });
        return dirty;
    },

    /**
     * 脏检查循环
     * 直到没有监控数据发生变化为止
     */
    $digest: function(){
        var ttl=10;   //脏检查循环次数上限
        var dirty;
        this.$$lastDirtyWatch=null;
        this.$beginPhase('$digest');

        //如果存在异步任务队列，则在脏检查循环时直接执行之
        if(this.$$applyAsyncId){
            clearTimeout(this.$$applyAsyncId);
            this.$$flushApplyAsync();
        }

        do{
            //第一轮脏检查循环结束后运行延时函数，延时函数也可能会改变作用域，因此也要进行脏检查循环
            while(this.$$asyncQueue.length>0){
                try{
                var task=this.$$asyncQueue.shift();
                task.scope.$eval(task.expression);
            }
            catch(error){
                console.log(error);
            }
            }

            dirty=this.$$digestOnce();
            if((dirty || this.$$asyncQueue.length>0) && (--ttl===0)){
                throw new Error('digest iterations readched');
            }
        }while(dirty || this.$$asyncQueue.length>0);   //确认异步队列没有任务
        this.$clearPhase();

        while(this.$$postDigestQueue.length>0){
            try{
            this.$$postDigestQueue.shift()();
        }
        catch(error){
            console.log(error);
        }
        }
    },

    /**
     * 判断新值和旧值是否相等
     * newValue 新值
     * oldValue 旧值
     * valueEq 是否值比较
     * return <Boolean> 是否相等
     */
    $$isEqual: function(newValue,oldValue,valueEq){
        if(valueEq){
            return _.isEqual(newValue,oldValue);
        }
        else{
            if(newValue===oldValue){
                return true;
            }
            else{
                //解决NaN不等于NaN的问题
                if(typeof newValue==='number' && typeof oldValue==='number'){
                    return isNaN(newValue) && isNaN(oldValue);
                }
                else{
                    return false;
                }
            }
        }
    },

    /**
     * 在作用域上下文执行函数
     */
    $eval: function(func,arg){
        //传入作用域作为其第一个参数
        return func(this,arg);
    },

    /**
     * 延时执行函数
     * 函数将在脏检查循环时执行
     */
    $evalAsync: function(func){
        var self=this;
        //确保注册异步函数后会调用脏检查循环
        if(!this.$$phase && !this.$$asyncQueue.length){
            setTimeout(function(){
                if(self.$$asyncQueue.length){
                    self.$digest();
                }
            },0);
        }

        this.$$asyncQueue.push({scope: this,expression: func});
    },

    /**
     * 执行非angular函数，改变监控数据
     * 会执行脏检查循环
     */
    $apply: function(func){
        try{
            this.$beginPhase('$apply');
            return this.$eval(func);
        }
        finally{
            this.$clearPhase();
            //确保一定会进行脏检查循环
            this.$digest();
        }
    },

    /**
     * 设置当前状态
     * 如果当前有状态则抛出异常
     */
    $beginPhase: function(phase){
        if(this.$$phase){
            throw new Error(this.$$phase+'is ready');
        }
        this.$$phase=phase;
    },

    /**
     * 清空当前状态
     */
    $clearPhase: function(){
        this.$$phase=null;
    },

    /**
     * 延时执行函数，主要用于延时执行http响应函数，仅调用一次脏检查循环
     */
    $applyAsync: function(func){
        var self=this;
        self.$$applyAsyncQueue.push(function(){
            self.$eval(func);
        });

        //防止重复设置定时器
        if(self.$$applyAsyncId===null){
            self.$$applyAsyncId=setTimeout(self.$$flushApplyAsync.bind(self),0);
        }
    },

    /**
     * 执行并清空任务队列
     */
    $$flushApplyAsync: function(){
        while(this.$$applyAsyncQueue.length>0){
            try{
            this.$$applyAsyncQueue.shift()();
        }
        catch(error){
            console.log(error);
        }
        }
        this.$$applyAsyncId=null;
    },

    /**
     * 注册脏检查循环后运行函数
     */
    $$postDigest: function(func){
        //循环后函数并没有传入任何参数
        this.$$postDigestQueue.push(func);   
    },

    /**
     * 注册多个监视器
     */
    $watchGroup: function(watchFns,listenFn){
        var self=this;
        var oldValues=new Array(watchFns.length);
        var newValues=new Array(watchFns.length);

        //确保监视器列表为空时，也会延时运行监听函数一次
        var exist=true;
        if(watchFns.length===0){
            self.$evalAsync(function(){
                if(exist){
                    listenFn(newValues,oldValues,self);
                }
            });
            //返回一个销毁监视器的方法
            return function(){
                exist=false;
            };
        }

        var changed=false;   //是否已经改变过
        var firstRun=true;   //是否第一次运行
        function watchGroupListener(){
            if(firstRun){
                //第一次运行时传入两次新值，避免后面重复判断新值是否等于旧值
                listenFn(newValues,newValues,self);
                firstRun=false;
            }
            else{
                listenFn(newValues,oldValues,self);
            }
            changed=false;
        }

        var destroy=watchFns.map(function(item,index){
            return self.$watch(item,function(newValue,oldValue){
                oldValues[index]=oldValue;
                newValues[index]=newValue;
               if(!changed){
                   changed=true;
                   //延时运行监听函数
                   self.$evalAsync(watchGroupListener);
               }
            });
        });

        return function(){
           destroy.forEach(function(item){
                item();
           });
        };
    },

    /**
     * 创建其子作用域
     */
    $new: function(){
        //创建一个子作用域构造函数，设置其原型对象，可用Object.create()替代
        var ChildScope=function(){};
        ChildScope.prototype=this;
        var child=new ChildScope();
        child.$$watchers=[];
        child.$$children=[];

        this.$$children.push(child);
        return child;
    },

    /**
     * 递归依次在当前作用域和子作用域中执行函数func
     */
    $$everyScope: function(func){
        //判断是否已经循环到了最下层作用域
        if(func(this)){
            return this.$$children.every(function(child){
                return child.$$everyScope(func);
            });
        }
        else{
            return false;
        }
    }
};

//独一无二的引用类型
function initWatchVal(){}

/*初始化作用域*/
/*var scope=new Scope();
scope.name='jc';
//添加监听器
scope.$watch(function(s){
    return s.name;
},function(newValue,oldValue,s){
    console.log('newValue is '+newValue+',oldValue is '+oldValue);
});*/
//初始化完毕后调用一次脏检查循环，用于记录下当前监听元素的初始值
//scope.$digest();

/*作用域运行阶段*/
//scope.name='red';
//scope.$digest();

/*两个监控数据相互影响，无限脏检查循环*/ 
/*scope.a=0;
scope.$watch(function(s){
    return s.a;
},function(newValue,oldValue,s){
    s.b++;
});

scope.b=0;
scope.$watch(function(s){
    return s.b;
},function(newValue,oldValue,s){
    s.a++;
});
scope.$digest();*/
