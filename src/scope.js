/* jshint globalstrict: true */
'use strict';

/**
 * 作用域引用类型
 * 
 */
function Scope(){
   this.$$watchers=[];   //监听器列表
}

Scope.prototype={
    /**
     * 添加监听器
     * watchFn 监控函数，返回监控对象
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
        this.$$watchers.push(watcher);
    },

    /**
     * 脏检查一次
     * 遍历作用域中监听器列表中所有的元素
     * return <Boolean> 是否存在监控数据修改
     */
    $$digestOnce: function(){
        var self=this;   //保存当前scope作用域
        var dirty=false;   //是否存在监控数据修改，调用过监听器函数，因为监听器函数也有可能改变其他监控值
        this.$$watchers.forEach(function(item){
            //从监控函数获取新值
            var newValue=item.watchFn(self);
            //读取保存的旧值
            var oldValue=item.last;

            if(!self.$$isEqual(newValue,oldValue,item.valueEq)){
                item.listenFn(newValue,
                    oldValue===initWatchVal? newValue:oldValue,
                    self);

                //如果值比较则进行深入拷贝
                item.last=(item.valueEq? _.cloneDeep(newValue) : newValue);
                dirty=true;
            }
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
        do{
            dirty=this.$$digestOnce();
            if(dirty && (--ttl===0)){
                throw new Error('digest iterations readched');
            }
        }while(dirty);
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
     * 执行非angular函数，改变监控数据
     * 会执行脏检查循环
     */
    $apply: function(func){
        try{
            return this.$eval(func);
        }
        finally{
            //确保一定会进行脏检查循环
            this.$digest();
        }
    }
};

//独一无二的引用类型
function initWatchVal(){}

/*初始化作用域*/
var scope=new Scope();
scope.name='jc';
//添加监听器
scope.$watch(function(s){
    return s.name;
},function(newValue,oldValue,s){
    console.log('newValue is '+newValue+',oldValue is '+oldValue);
});
//初始化完毕后调用一次脏检查循环，用于记录下当前监听元素的初始值
scope.$digest();

/*作用域运行阶段*/
scope.name='red';
scope.$digest();

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
