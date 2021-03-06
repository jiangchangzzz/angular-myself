# Scope Inheritance

1.$new函数可以在创建父作用域的子作用域，创建子作用域基于js的原型继承。
子作用域可以读取父作用域的属性，而父作用域不能读取子作用域的属性。
父作用域的属性无论在何时定义的，子作用域都可以读取，并对对象属性进行修改。
用js的原型式继承即可实现以上需求，Object.create()，基于已有的对象创建新的对象，继承已有的对象属性和原型。

2.原型式继承会有属性覆盖的特点，这一点是富有争议的。
当读取作用域上的属性时，如果作用域上没有这一属性，则会沿着它的原型链向上依次搜索父作用域中的属性。
当给作用域上的属性赋值时，这一属性仅当前作用域和子作用域可以访问，同时会遮盖父作用域中的同名属性，并不会改变父作用域属性值。
这时有两个同名属性在作用域链上，为了避免这一情况，一种通用的方法是，将属性包装在一个对象的属性中，因为两个作用域的引用都指向同一个对象。

3.无论何时你使用双向绑定，需要有一个点号在表达式中，如果没有，则可能已经出现了错误。

4.应该分离监视器，需要在脏检查循环时，仅脏检查当前作用域中注册的监视器和其子作用域，而不应该脏检查循环父作用域。
每个作用域都有自己的监视器列表，是通过属性遮蔽实现的，调用子作用域的脏检查循环只会检查当前作用域中的监视器列表。

5.为了能递归脏检查循环，需要每个作用域用$$children记录下来其子作用域。
angular本身并不会用children数组来记录其子作用域，而是通过一个链表记录子作用域，使用$$nextSibling, $$prevSibling, $$childHead,$$childTail
来记录下一层作用域和上一层作用域，让它可以很轻松地添加和删除子作用域，而不用去操作一个数组。

6.调用$apply来从根作用域遍历整个作用域进行脏检查循环，使用原型式集成，可以让每个作用域都访问到他们的根作用域$scope.$apply方法是一种期望的方式来调用外部代码，如果你不知道哪些作用域将会被外部代码所改变，就调用$apply方法最安全。而如果你只需要在当前作用域和其子作用域中执行脏检查循环，则只需要调用$digest方法，能够获得更好的性能。

7.调用$evalAsync来从根作用域遍历整个作用域进行脏检查循环.

8.调用$new创建子作用域时，可以根据传入的参数，创建出分离的子作用域，无法访问其父作用域上的属性，也无法监视其父作用域上的属性，并非原型式集成。

9.一个分离的子作用域并没有完全切断与副作用域之间的联系，这一部分将在指令中实现。

10.可以通过传入$new函数的第二个参数，取代其当前父作用域。

11.可以通过作用域$parent属性，访问其副作用域。但是使用它往往是一个反面教材，因为这会导致作用域之间的紧密耦合。

12.总结：
    - 创建子作用域
    - 作用域继承实际上是一种原型式继承
    - 属性遮蔽和相应的实现
    - 从根作用域开始进行递归地脏检查循环
    - digest仅会在当前作用域和其子作用域脏检查循环，apply则会从根作用域开始
    - 分离的作用域无法获取到其父作用域的信息，但是仍然可以从父作用域开始脏检查循环
    - 子作用域是可以通过$destroy销毁的
    - angular有$watchCollection机制可以有效地监视对象和数组的变化

