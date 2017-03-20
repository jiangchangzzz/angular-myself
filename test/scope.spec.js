/* jshint globalstrict: true */
/* global Scope: false */
'use strict';

describe('Scope',function(){
    it('can be constructed and used as an object',function(){
        var scope=new Scope();
        scope.aProperty=1;

        expect(scope.aProperty).toBe(1);
    });

    describe('digest',function(){

        var scope;

        beforeEach(function(){
            scope=new Scope();
        });

        it('calls the listener function of a watch',function(){
            var watchFn=function(){return 'wat'};
            var listenerFn=jasmine.createSpy();
            scope.$watch(watchFn,listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch function witch the scope as argument',function(){
            var watchFn=jasmine.createSpy();
            var listenerFn=function(){};
            scope.$watch(watchFn,listenerFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('calls the listener function when the watched value changed',function(){
            scope.a='red';
            scope.counter=0;

            scope.$watch(function(scope){
                return scope.a;
            },function(newValue,oldValue,scope){
                scope.counter++;
            });

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.a='green';
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('calls listener when watch value is first undefined',function(){
            scope.counter=0;

            scope.$watch(function(scope){
                return scope.someValue;
            },function(newValue,oldValue,scope){
                scope.counter++;
            });

            //希望监视数据变为undefined时调用监听函数
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('calls listenFn once with newValue as oldValue',function(){
            scope.value='red';
            var oldValueRes;

            scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                oldValueRes=oldValue;
            });
            
            scope.$digest();
            expect(oldValueRes).toBe('red');
        });

        it('watchFn is requied and listen is optional',function(){
            var watchFn=jasmine.createSpy().and.returnValue(1);
            
            scope.$watch(watchFn);
            scope.$digest();

            expect(watchFn).toHaveBeenCalled();
        });

        it('change other watch in the same digest',function(){
            var counter=0;
            scope.$watch(function(scope){
                return scope.a;
            },function(){
                counter++;
            });

            scope.$watch(function(scope){
                return scope.b;
            },function(newValue,oldValue,scope){
                scope.a=0;
            });

            scope.$digest();
            expect(counter).toBe(2);
        });

        it('two watches looking at changes made by each other throw Error',function(){
            scope.a=0;
            scope.b=0;

            scope.$watch(function(scope){
                return scope.a;
            },function(newValue,oldValue,scope){
                scope.b++;
            });

            scope.$watch(function(scope){
                return scope.b;
            },function(newValue,oldValue,Scope){
                scope.a++;
            });

            expect(function(){scope.$digest()}).toThrow();
        });

        it('ends the digest when the last watch is clean',function(){
            scope.array=new Array(100);
            var counter=0;

            for(var i=0;i<100;i++){
                scope.$watch((function(i){
                    return function(scope){
                        counter++;
                        return scope.array[i];
                    }
                })(i));
            }

            scope.$digest();
            expect(counter).toBe(200);

            scope.array[0]=0;
            scope.$digest();
            expect(counter).toBe(301);
        });

        it('does not end digest when add new watch',function(){
            scope.a=0;
            var counter=0;

            scope.$watch(function(scope){
                return scope.a;
            },function(newValue,oldValue,scope){
                scope.$watch(function(){
                    return scope.a;
                },function(){
                    counter++;
                })
            });

            scope.$digest();
            expect(counter).toBe(1);
        });

        it('compares base on value',function(){
            scope.array=[];
            var counter=0;

            scope.$watch(function(scope){
                return scope.array;
            },function(){
                counter++;    
            },true);
            scope.$digest();
            expect(counter).toBe(1);

            scope.array.push(1);
            scope.$digest();
            expect(counter).toBe(2);
        });

        it('make NaN equal NaN',function(){
            scope.num=0/0;
            var counter=0;
            scope.$watch(function(scope){
                return scope.num;
            },function(newValue,oldValue,scope){
                counter++;
            });

            scope.$digest();
            expect(counter).toBe(1);

            scope.$digest();
            expect(counter).toBe(1);
        });

        it('$eval: function in scope',function(){
            scope.value=0;
            var res=scope.$eval(function(scope){
                return scope.value;
            });

            expect(res).toBe(0);
        });

        it('$eval: function with arg',function(){
            scope.value=0;
            var res=scope.$eval(function(scope,arg){
                return scope.value+arg;
            },1);

            expect(res).toBe(1);
        })
    });
});