
// [
//   { name: "Alice", age: 31 },
//   { name: "Bob", age: 26 },
//   { name: "Charlie", age: 36 }
// ]

class ListItem {
    constructor(value) {
        this.value = value;
    }
}

class MendixList {
    constructor(initialItems) {
        this.items = initialItems.map(item => new ListItem(item));
    }

    get(index) {
        return this.items[index];
    }

    length() {
        return this.items.length;
    }

    toArray() {
        return this.items.map(item => item.value);
    }
}

function test1() {
    // 首先，定义我们的辅助类
    console.log('666')


    // 假设 PersonList 是从某处获取的
    let PersonList = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Charlie", age: 35 }
    ];

    // 创建 MendixList 实例
    const mendixList = new MendixList(PersonList);

    // 循环遍历并修改年龄
    for (let i = 0; i < mendixList.length(); i++) {
        const currentPerson = mendixList.get(i);
        // 修改年龄
        currentPerson.value.age += 1;
    }

    // 获取修改后的列表
    PersonList = mendixList.toArray();

    console.log(PersonList);
    // 输出:
}

// test1();

function test2() {
    let PersonList = [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
        { name: "Charlie", age: 35 }
    ];
    for (let i = 0; i < PersonList.length; i++) {
        let item = PersonList[i]
        item.age += 1;
    }
    console.log(PersonList);
}

// test2();


function test3() {
    let list = [1, 2, 3]
    for (let i = 0; i < list.length; i++) {
        let item = list[i]
        item += 1;
    }
    console.log(list);
}

// test3()

function test4() {
    let list = [1, 2, 3]
    const mendixList = new MendixList(list);

    // 循环遍历并修改年龄
    for (let i = 0; i < mendixList.length(); i++) {
        const currentPerson = mendixList.get(i);
        // 修改年龄
        currentPerson.value += 1;
    }

    // 获取修改后的列表
    const PersonList = mendixList.toArray();

    console.log(PersonList);
    console.log(list)
}

test4()