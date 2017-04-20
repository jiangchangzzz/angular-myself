/* jshint globalstrict: true */
/* global Scope: false */
'use strict';

describe('$watchCollection',function(){
    var scope;

    beforeEach(function(){
        scope=new Scope();
    });

    it('work as normal watch',function(){
        var ready;
        scope.value='jc';
        scope.counter=0;

        scope.$watchCollection(function(scope){
            return scope.value;
        },function(newValue,oldValue,scope){
            ready=newValue;
            scope.counter++;
        });

        scope.$digest();
        expect(scope.counter).toBe(1);
        expect(ready).toBe('jc');
    });

    it('work when arguments ar NaN',function(){
        scope.value=0/0;
        scope.counter=0;

        scope.$watchCollection(function(scope){
            return scope.value;
        },function(newValue,oldValue,scope){
            scope.counter++;
        });

        scope.$digest();
        expect(scope.counter).toBe(1);

        scope.$digest();
        expect(scope.counter).toBe(1);
    });

    it('notice when value become array',function(){
        scope.counter=0;

        scope.$watchCollection(function(scope){
            return scope.arr;
        },function(newValue,oldValue,scope){
            scope.counter++;
        });

        scope.$digest();
        expect(scope.counter).toBe(1);

        scope.arr=[1,2,3];
        scope.$digest();
        expect(scope.counter).toBe(2);

        scope.$digest();
        expect(scope.counter).toBe(2);
    });

    it('notice array push item',function(){
        scope.arr=[1,2,3];
        scope.counter=0;

        scope.$watchCollection(function(scope){
            return scope.arr;
        },function(newValue,oldValue,scope){
            scope.counter++;
        });

        scope.$digest();
        expect(scope.counter).toBe(1);

        scope.arr.push(1);
        scope.$digest();
        expect(scope.counter).toBe(2);

        scope.$digest();
        expect(scope.counter).toBe(2);
    });

    it('notice array remove item',function(){
        scope.arr=[1,2,3];
        scope.counter=0;

        scope.$watchCollection(function(scope){
            return scope.arr;
        },function(newValue,oldValue,scope){
            scope.counter++;
        });

        scope.$digest();
        expect(scope.counter).toBe(1);

        scope.arr.shift();
        scope.$digest();
        expect(scope.counter).toBe(2);

        scope.$digest();
        expect(scope.counter).toBe(2);
    });

    it('notice replace in array',function(){
        scope.arr=[1,2,3];
        scope.counter=0;

        scope.$watchCollection(function(scope){
            return scope.arr;
        },function(newValue,oldValue,scope){
            scope.counter++;
        });

        scope.$digest();
        expect(scope.counter).toBe(1);

        //改变数组元素的值
        scope.arr[0]=2;
        scope.$digest();
        expect(scope.counter).toBe(2);
    });

    it('notice change order in array',function(){
        scope.arr=[3,2,1];
        scope.counter=0;

        scope.$watchCollection(function(scope){
            return scope.arr;
        },function(newValue,oldValue,scope){
            scope.counter++;
        });

        scope.$digest();
        expect(scope.counter).toBe(1);

        //改变数组元素的次序
        scope.arr.sort(function(a,b){
            return a-b;
        });
        scope.$digest();
        expect(scope.counter).toBe(2);
    });

    it('notice NaN in array',function(){
        scope.arr=[1,NaN,2];
        scope.counter=0;

        scope.$watchCollection(function(scope){
            return scope.arr;
        },function(newValue,oldValue,scope){
            scope.counter++;
        });

        scope.$digest();
        expect(scope.counter).toBe(1);
    });
});
