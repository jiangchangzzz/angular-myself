/* jshint globalstrict: true */
/* global Scope: false */
'use strict';

describe('Scope', function () {
    it('can be constructed and used as an object', function () {
        var scope = new Scope();
        scope.aProperty = 1;

        expect(scope.aProperty).toBe(1);
    });

    describe('digest', function () {

        var scope;

        beforeEach(function () {
            scope = new Scope();
        });

        it('calls the listener function of a watch', function () {
            var watchFn = function () {
                return 'wat'
            };
            var listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch function witch the scope as argument', function () {
            var watchFn = jasmine.createSpy();
            var listenerFn = function () {};
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('calls the listener function when the watched value changed', function () {
            scope.a = 'red';
            scope.counter = 0;

            scope.$watch(function (scope) {
                return scope.a;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.a = 'green';
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('calls listener when watch value is first undefined', function () {
            scope.counter = 0;

            scope.$watch(function (scope) {
                return scope.someValue;
            }, function (newValue, oldValue, scope) {
                scope.counter++;
            });

            //希望监视数据变为undefined时调用监听函数
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('calls listenFn once with newValue as oldValue', function () {
            scope.value = 'red';
            var oldValueRes;

            scope.$watch(function (scope) {
                return scope.value;
            }, function (newValue, oldValue, scope) {
                oldValueRes = oldValue;
            });

            scope.$digest();
            expect(oldValueRes).toBe('red');
        });

        it('watchFn is requied and listen is optional', function () {
            var watchFn = jasmine.createSpy().and.returnValue(1);

            scope.$watch(watchFn);
            scope.$digest();

            expect(watchFn).toHaveBeenCalled();
        });

        it('change other watch in the same digest', function () {
            var counter = 0;
            scope.$watch(function (scope) {
                return scope.a;
            }, function () {
                counter++;
            });

            scope.$watch(function (scope) {
                return scope.b;
            }, function (newValue, oldValue, scope) {
                scope.a = 0;
            });

            scope.$digest();
            expect(counter).toBe(2);
        });

        it('two watches looking at changes made by each other throw Error', function () {
            scope.a = 0;
            scope.b = 0;

            scope.$watch(function (scope) {
                return scope.a;
            }, function (newValue, oldValue, scope) {
                scope.b++;
            });

            scope.$watch(function (scope) {
                return scope.b;
            }, function (newValue, oldValue, Scope) {
                scope.a++;
            });

            expect(function () {
                scope.$digest()
            }).toThrow();
        });

        it('ends the digest when the last watch is clean', function () {
            scope.array = new Array(100);
            var counter = 0;

            for (var i = 0; i < 100; i++) {
                scope.$watch((function (i) {
                    return function (scope) {
                        counter++;
                        return scope.array[i];
                    }
                })(i));
            }

            scope.$digest();
            expect(counter).toBe(200);

            scope.array[0] = 0;
            scope.$digest();
            expect(counter).toBe(301);
        });

        it('does not end digest when add new watch', function () {
            scope.a = 0;
            var counter = 0;

            scope.$watch(function (scope) {
                return scope.a;
            }, function (newValue, oldValue, scope) {
                scope.$watch(function () {
                    return scope.a;
                }, function () {
                    counter++;
                })
            });

            scope.$digest();
            expect(counter).toBe(1);
        });

        it('compares base on value', function () {
            scope.array = [];
            var counter = 0;

            scope.$watch(function (scope) {
                return scope.array;
            }, function () {
                counter++;
            }, true);
            scope.$digest();
            expect(counter).toBe(1);

            scope.array.push(1);
            scope.$digest();
            expect(counter).toBe(2);
        });

        it('make NaN equal NaN', function () {
            scope.num = 0 / 0;
            var counter = 0;
            scope.$watch(function (scope) {
                return scope.num;
            }, function (newValue, oldValue, scope) {
                counter++;
            });

            scope.$digest();
            expect(counter).toBe(1);

            scope.$digest();
            expect(counter).toBe(1);
        });

        it('$eval: function in scope', function () {
            scope.value = 0;
            var res = scope.$eval(function (scope) {
                return scope.value;
            });

            expect(res).toBe(0);
        });

        it('$eval: function with arg', function () {
            scope.value = 0;
            var res = scope.$eval(function (scope, arg) {
                return scope.value + arg;
            }, 1);

            expect(res).toBe(1);
        })

        it('$apply: run funcion with digest', function () {
            scope.value = 0;
            var counter = 0;

            scope.$watch(function (scope) {
                return scope.value;
            }, function () {
                counter++;
            });

            scope.$digest();
            expect(counter).toBe(1);

            scope.$apply(function (scope) {
                scope.value++;
            });
            scope.$digest();
            expect(counter).toBe(2);
        });

        it('$evalAsync: run function defer within digest', function () {
            scope.value = 1;
            scope.excute = false;
            scope.excuteIm = false;

            scope.$watch(function (scope) {
                return scope.value;
            }, function (newValue, oldValue, scope) {
                scope.$evalAsync(function (scope) {
                    scope.excute = true;
                });
                scope.excuteIm = scope.excute;
            });
            scope.$digest();
            expect(scope.excute).toBe(true);
            expect(scope.excuteIm).toBe(false);
        });

        it('$evalAsync: run function in watchFn', function () {
            scope.value = 0;
            scope.times = 0;
            scope.$watch(
                function (scope) {
                    //前两次才运行延时函数，如果始终运行延时函数，脏检查循环就不会停止
                    if (scope.times < 2) {
                        scope.$evalAsync(function (scope) {
                            scope.times++;
                        });
                    }
                    return scope.value;
                });
            scope.$digest();
            expect(scope.times).toBe(2);
        });

        it('$evalAsync always run in watchFn', function () {
            scope.value = 0;

            scope.$watch(function (scope) {
                scope.$evalAsync(function () {});
                return scope.value;
            });

            expect(function () {
                scope.$digest();
            }).toThrow();
        });

        it('$$phase: status about $digest or $apply', function () {
            scope.value = 0;
            scope.applying = undefined;
            scope.watching = undefined;
            scope.listening = undefined;

            scope.$watch(function (scope) {
                scope.watching = scope.$$phase;
                return scope.value;
            }, function (newValue, oldValue, scope) {
                scope.listening = scope.$$phase;
            });

            scope.$apply(function (scope) {
                scope.applying = scope.$$phase;
            });

            expect(scope.watching).toBe('$digest');
            expect(scope.listening).toBe('$digest');
            expect(scope.applying).toBe('$apply');
        });

        it('$evalAsync: run digest to run asyncQueue',function(done){
            scope.value=0;
            var counter=0;
            scope.$watch(function(scope){
                return scope.value;
            },function(){
                counter++;
            });

            scope.$evalAsync(function(scope){});
            expect(counter).toBe(0);

           setTimeout(function(){
               expect(counter).toBe(1);
               //异步测试支持，测试完成再调用他
               done();
           },50);
        });

        it('$applyAsync: async do task',function(){
            scope.counter=0;
            scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$applyAsync(function(){
                scope.value='ready';
            });
            expect(scope.counter).toBe(1);

            setTimeout(function(){
                expect(scope.counter).toBe(2);
                done();   //测试异步调用完成后调用done
            },50); 
        });

        it('$applyAsync: run in listener',function(){
            scope.value=1;
            scope.isApply=false;
            scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                scope.$applyAsync(function(scope){
                    scope.isApply=true;
                });
            });

            scope.$digest();
            expect(scope.isApply).toBe(false);
            setTimeout(function(){
                expect(scope.isApply).toBe(true);
                done();
            },50);
        });

        it('$applyAsync: combine digest',function(){
            scope.counter=0;
            scope.$watch(function(scope){
                scope.counter++;
                return scope.value;
            });

            scope.$applyAsync(function(scope){
                scope.value=1;
            });

            scope.$applyAsync(function(scope){
                scope.value=2;
            });

            setTimeout(function(){
                expect(scope.counter).toBe(2);
                done();
            },50);
        });

        it('$$postDigest: run after digest',function(){
            scope.counter=0;

            scope.$$postDigest(function(){
                scope.counter++;
            });

            expect(scope.counter).toBe(0);
            
            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('$$postDigest: without digest',function(){
            scope.value=1;
            //$$postDigest注册的循环后运行函数没有传入任何参数
            scope.$$postDigest(function(){
                scope.value=2;
            });

            scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                scope.newValue=newValue;
            });

            scope.$digest();
            expect(scope.newValue).toBe(1);

            scope.$digest();
            expect(scope.newValue).toBe(2);
        });

         it('exception in watchFn',function(){
            scope.value='test';
            scope.counter=0;

            scope.$watch(function(scope){
                throw 'error';
            });

            scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);
         });

         it('exception in listenFn',function(){
            scope.value='test';
            scope.counter=0;

            scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                throw 'error';
            });

            scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);
         });

         it('exception in $evalAsync',function(){
            scope.value='test';
            scope.counter=0;

            scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                return scope.counter++;
            });

            scope.$evalAsync(function(scope){
                throw 'error';
            });

            setTimeout(function(){
                expect(scope.counter).toBe(1);
                done();
            },50);
         });

         it('exception in $applyAsync',function(){
            scope.counter=0;
            scope.$applyAsync(function(scope){
                throw 'error';
            });

            scope.$applyAsync(function(scope){
                throw 'error';
            })
            
            scope.$applyAsync(function(scope){
                scope.counter++;
            });

            setTimeout(function(){
                expect(scope.counter).toBe(1);
                done();
            },50);
         });

         it('exception in $$postDigest',function(){
            var counter=0;
            scope.$$postDigest(function(){
                throw 'error';
            });

            scope.$$postDigest(function(){
                counter++;
            });

            scope.$digest();
            expect(counter).toBe(1);
         });

         it('destory watcher by $watch return',function(){
            scope.value='test';
            scope.counter=0;

            var destroyWatcher=scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);

            destroyWatcher();
            scope.$digest();
            expect(scope.counter).toBe(1);
         });

         it('destroy watcher in watchFn',function(){
             scope.value='test';
             var res=[];

             scope.$watch(function(scope){
                res.push(1);
                return scope.value;
             });

             var destroy=scope.$watch(function(scope){
                res.push(2);
                destroy();
             });

             scope.$watch(function(scope){
                res.push(3);
                return scope.value;
             });

             scope.$digest();
             expect(res).toEqual([1,2,3,1,3]);
         });

         it('watcher destroy other watcher',function(){
            scope.value='test';
            scope.counter=0;

            scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                destroy();
            });

            var destroy=scope.$watch(function(){

            },function(newValue,oldValue,scope){

            });

            scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);
         });

         it('watcher destroy some watchers',function(){
            scope.value='test';
            scope.counter=0;

            var destroyWatcher=scope.$watch(function(scope){
                destroyWatcher();
                destroyWatcher1();
                destroyWatcher2();
            });

            var destroyWatcher1=scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                scope.counter++;
            });

            var destroyWatcher2=scope.$watch(function(scope){
                return scope.value;
            },function(newValue,oldValue,scope){
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(0);
         });
    });

    describe('$watchGroup',function(){
        var scope;
        beforeEach(function(){
            scope=new Scope();
        });

        it('take watches as an array and calls listener',function(){
            var getNewValue;
            var getOldValue;

            scope.a=1;
            scope.b=2;
            
            scope.$watchGroup([function(scope){
                return scope.a;
            },function(scope){
                return scope.b;
            }],function(newValue,oldValue,scope){
                getNewValue=newValue;
                getOldValue=oldValue;
            });

            scope.$digest();
            expect(getNewValue).toEqual([1,2]);
            expect(getOldValue).toEqual([1,2]);
        });

        it('call $watchGroup once per digest',function(){
            scope.a=0;
            scope.b=0;
            scope.counter=0;

            scope.$watchGroup([function(scope){
                return scope.a;
            },function(scope){
                return scope.b;
            }],function(newValue,oldValue,scope){
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('use the same array on the first run',function(){
            scope.a=0;
            scope.b=0;
            var getNewValue;
            var getOldValue;

            scope.$watchGroup([function(scope){
                return scope.a;
            },function(scope){
                return scope.b;
            }],function(newValue,oldValue,scope){
                getNewValue=newValue;
                getOldValue=oldValue;
            });

            scope.$digest();
            expect(getNewValue).toBe(getOldValue);
        });

        it('use different array on the next run',function(){
            scope.a=0;
            scope.b=0;
            var getNewValue;
            var getOldValue;

            scope.$watchGroup([function(scope){
                return scope.a;
            },function(scope){
                return scope.b;
            }],function(newValue,oldValue,scope){
                getNewValue=newValue;
                getOldValue=oldValue;
            });

            scope.$digest();
            scope.a=1;
            scope.$digest();
            expect(getOldValue).toEqual([0,0]);
            expect(getNewValue).toEqual([1,0]);
        });

        it('call listener once when watchFns is empty',function(){
            var getOldValue;
            var getNewValue;

            scope.$watchGroup([],function(newValue,oldValue,scope){
                getOldValue=oldValue;
                getNewValue=newValue;
            });

            scope.$digest();
            expect(getOldValue).toEqual([]);
            expect(getNewValue).toEqual([]);
        });

        it('destroy watchGroup',function(){
            scope.a=0;
            scope.b=0;
            scope.counter=0;

            var destroy=scope.$watchGroup([function(scope){
                return scope.a;
            },function(){
                return scope.b;
            }],function(){
                scope.counter++;
            });

            scope.$digest();
            expect(scope.counter).toBe(1);

            destroy();
            scope.a=1;
            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('destroy empty watchGroup',function(){
            scope.counter=0;
            var destroy=scope.$watchGroup([],
                function(newValue,oldValue,scope){
                    scope.counter++;
            });
            destroy();
            scope.$digest();
            expect(scope.counter).toBe(0);
        });
    });
});