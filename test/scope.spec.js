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
        })
    })
});