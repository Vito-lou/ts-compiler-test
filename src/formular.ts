import * as ts from 'typescript';

// 上下文管理
class Context {
    private variables: { [key: string]: any } = {};

    setVariable(name: string, value: any) {
        this.variables[name] = value;
    }

    getVariable(name: string): any {
        return this.variables[name];
    }
}

// 模拟公式解析器
class FormulaEditor {
    parse(formula: string): boolean {
        // 这里可以实现公式解析逻辑
        // 例如，简单的逻辑判断
        return formula === 'true'; // 示例：如果公式是'true'，返回true
    }
}

// 处理赋值节点
function handleChangeVariableNode(node: any, context: Context): ts.Statement {
    const { properties } = node;
    const variableName = properties.key[1];
    let valueExpression;

    if (properties.valueType === 'EXPRESSION') {
        // 生成调用 FormulaEditor 的 AST 节点
        valueExpression = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
                ts.factory.createNewExpression(ts.factory.createIdentifier('FormulaEditor'), undefined, []),
                'parse'
            ),
            undefined,
            [ts.factory.createStringLiteral(properties.value)] // 使用 createStringLiteral
        );
    } else {
        valueExpression = ts.factory.createStringLiteral(properties.value); // 使用 createStringLiteral
    }

    context.setVariable(variableName, valueExpression); // 更新上下文中的变量

    return ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
            [
                ts.factory.createVariableDeclaration(
                    ts.factory.createIdentifier(variableName),
                    undefined,
                    undefined,
                    valueExpression // 使用生成的值表达式
                )
            ],
            ts.NodeFlags.Const
        )
    );
}

// 处理条件节点
function handleIfNode(node: any, context: Context, formulaEditor: FormulaEditor): ts.Statement {
    const conditionValue = node.conditionValue; // 这里假设是一个简单的表达式

    let valueExpression;

    if (node.conditionValueType === 'EXPRESSION') {
        // 生成调用 FormulaEditor 的 AST 节点
        valueExpression = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
                ts.factory.createNewExpression(ts.factory.createIdentifier('FormulaEditor'), undefined, []),
                'parse'
            ),
            undefined,
            [ts.factory.createStringLiteral(node.conditionValue)] // 使用 createStringLiteral
        );
    } else {
        valueExpression = ts.factory.createStringLiteral(node.conditionValue); // 使用 createStringLiteral
    }

    // console.log('if node conditionValue', conditionValue)
    // const trueBranch = ts.factory.createBlock([
    //     ts.factory.createExpressionStatement(ts.factory.createCallExpression(
    //         ts.factory.createIdentifier('console.log'),
    //         undefined,
    //         [ts.factory.createStringLiteral('True branch executed')] // 使用 createStringLiteral
    //     ))
    // ]);

    // const falseBranch = ts.factory.createBlock([
    //     ts.factory.createExpressionStatement(ts.factory.createCallExpression(
    //         ts.factory.createIdentifier('console.log'),
    //         undefined,
    //         [ts.factory.createStringLiteral('False branch executed')] // 使用 createStringLiteral
    //     ))
    // ]);
    console.log('truebranch', node.trueBranch)
    const trueBranchNodeInfo = intermediateJson.nodes.find((n: any) => n.id === node.trueBranch);
    console.log('trueBranchNodeInfo', trueBranchNodeInfo)
    const falseBranchNodeInfo = intermediateJson.nodes.find((n: any) => n.id === node.falseBranch);
    console.log('falseBranchNodeInfo', falseBranchNodeInfo)
    const trueBranch = ts.factory.createBlock(
        node.trueBranch ? [handleNode(trueBranchNodeInfo, context)] : []
    );


    const falseBranch = ts.factory.createBlock(
        node.falseBranch ? [handleNode(falseBranchNodeInfo, context)] : []
    );
    return ts.factory.createIfStatement(
        valueExpression, // 使用生成的值表达式
        trueBranch,
        falseBranch
    );
}

// 处理开关节点
function handleSwitchNode(node: any, context: Context): ts.Statement {
    let valueExpression;

    if (node.conditionValueType === 'EXPRESSION') {
        // 生成调用 FormulaEditor 的 AST 节点
        valueExpression = ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
                ts.factory.createNewExpression(ts.factory.createIdentifier('FormulaEditor'), undefined, []),
                'parse'
            ),
            undefined,
            [ts.factory.createStringLiteral(node.conditionValue)] // 使用 createStringLiteral
        );
    } else {
        valueExpression = ts.factory.createStringLiteral(node.conditionValue); // 使用 createStringLiteral
    }

    const switchCases = node.cases.map((caseNode: any) => {
        return ts.factory.createCaseClause(
            ts.factory.createStringLiteral(caseNode.conditionValue), // 使用 createStringLiteral
            [
                ts.factory.createExpressionStatement(ts.factory.createCallExpression(
                    ts.factory.createIdentifier('console.log'),
                    undefined,
                    [ts.factory.createStringLiteral(`Case ${caseNode.conditionValue} executed`)] // 使用 createStringLiteral
                ))
            ]
        );
    });

    return ts.factory.createSwitchStatement(
        valueExpression, // 使用生成的值表达式
        ts.factory.createCaseBlock(switchCases)
    );
}

// 生成 TypeScript 代码的函数
function generateTsCode(intermediateJson: any): ts.SourceFile {
    const statements: ts.Statement[] = [];
    const context = new Context();
    const formulaEditor = new FormulaEditor();

    // 注入输入变量
    for (const variable of intermediateJson.vars) {
        context.setVariable(variable.key, variable.name);
    }


    // 从 start-node 开始处理节点
    let currentNodeId = intermediateJson.nodes.find((node: any) => node.shape === 'start-node')?.id;

    while (currentNodeId) {
        const currentNode = intermediateJson.nodes.find((node: any) => node.id === currentNodeId);
        if (currentNode) {
            switch (currentNode.shape) {
                case 'change-variable-node':
                    statements.push(handleChangeVariableNode(currentNode, context));
                    break;
                case 'if-node':
                    statements.push(handleIfNode(currentNode, context, formulaEditor));
                    break;
                case 'switch-node':
                    statements.push(handleSwitchNode(currentNode, context));
                    break;
                case 'loop-node':
                    statements.push(handleLoopNode(currentNode, context));
                    break;
                // 其他节点类型的处理...
                default:
                    console.warn(`未处理的节点类型: ${currentNode.shape}`);
            }
            currentNodeId = currentNode.next; // 更新当前节点为下一个节点
        } else {
            break; // 如果找不到当前节点，退出循环
        }
    }
    // console.log('statements', JSON.stringify(statements))
    return ts.factory.createSourceFile(statements, ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);
}

// 处理循环节点的函数
function handleLoopNode(node: any, context: Context): ts.Statement {
    const loopStatements = node.body.map((bodyNodeId: string) => {
        const bodyNodeInfo = intermediateJson.nodes.find((n: any) => n.id === bodyNodeId);
        console.log('what bodyinfo', bodyNodeInfo)
        return handleNode(bodyNodeInfo, context); // 递归处理每个节点，传入完整的节点信息
    });

    // 处理 loopObject 的值
    const loopObjectValueExpression = ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
            ts.factory.createNewExpression(ts.factory.createIdentifier('FormulaEditor'), undefined, []),
            'parse'
        ),
        undefined,
        [ts.factory.createStringLiteral(node.properties.loopList)] // 使用 createStringLiteral
    );

    // 创建 for 循环
    // return ts.factory.createForStatement(
    //     ts.factory.createVariableDeclarationList([
    //         ts.factory.createVariableDeclaration(
    //             ts.factory.createIdentifier(node.properties.loopIndex), // 循环索引
    //             undefined,
    //             undefined,
    //             ts.factory.createNumericLiteral(0) // 初始化索引为 0
    //         )
    //     ]),
    //     ts.factory.createBinaryExpression(
    //         ts.factory.createIdentifier(node.properties.loopIndex), // 循环条件
    //         ts.SyntaxKind.LessThanToken,
    //         ts.factory.createPropertyAccessExpression(
    //             loopObjectValueExpression, // 使用生成的 loopObject 值
    //             ts.factory.createIdentifier("length") // 获取数组长度
    //         )
    //     ),
    //     ts.factory.createPostfixIncrement(ts.factory.createIdentifier(node.properties.loopIndex)), // 增量
    //     ts.factory.createBlock([
    //         ts.factory.createVariableStatement(
    //             [ts.factory.createModifier(ts.SyntaxKind.ConstKeyword)], // 使用 const
    //             ts.factory.createVariableDeclarationList([
    //                 ts.factory.createVariableDeclaration(
    //                     ts.factory.createIdentifier(node.properties.loopObject), // 循环中的每一项
    //                     undefined,
    //                     undefined,
    //                     ts.factory.createElementAccessExpression(
    //                         loopObjectValueExpression, // 使用生成的 loopObject 值
    //                         ts.factory.createIdentifier(node.properties.loopIndex) // 当前索引
    //                     )
    //                 )
    //             ])
    //         ),
    //         ...loopStatements // 循环体内的其他语句
    //     ], true) // 循环体
    // );
    return ts.factory.createForStatement(
        ts.factory.createVariableDeclarationList([
            ts.factory.createVariableDeclaration(
                ts.factory.createIdentifier(node.properties.loopIndex),
                undefined,
                undefined,
                ts.factory.createNumericLiteral(0)
            )
        ], ts.NodeFlags.Let),
        ts.factory.createBinaryExpression(
            ts.factory.createIdentifier(node.properties.loopIndex),
            ts.SyntaxKind.LessThanToken,
            ts.factory.createPropertyAccessExpression(
                loopObjectValueExpression,
                ts.factory.createIdentifier("length")
            )
        ),
        ts.factory.createPostfixIncrement(ts.factory.createIdentifier(node.properties.loopIndex)),
        ts.factory.createBlock([
            // ts.factory.createVariableStatement(
            //     undefined,
            ts.factory.createVariableDeclarationList([
                ts.factory.createVariableDeclaration(
                    ts.factory.createIdentifier(node.properties.loopObject),
                    undefined,
                    undefined,
                    ts.factory.createElementAccessExpression(
                        loopObjectValueExpression,
                        ts.factory.createIdentifier(node.properties.loopIndex)
                    )
                )
            ], ts.NodeFlags.Const),
            // ),
            ...loopStatements
        ], true)
    );
}

// 处理任意节点的函数
function handleNode(node: any, context: Context): ts.Statement {
    console.log('what get node', node)
    switch (node.shape) {
        case 'change-variable-node':
            return handleChangeVariableNode(node, context);
        case 'if-node':
            return handleIfNode(node, context, new FormulaEditor());
        case 'switch-node':
            return handleSwitchNode(node, context);
        case 'loop-node':
            return handleLoopNode(node, context);
        // 其他节点类型的处理...
        default:
            console.warn(`未处理的节点类型: ${node.shape}`);
            return ts.factory.createEmptyStatement(); // 返回空语句以避免错误
    }
}
// 编译 AST 为 TypeScript 代码
function printTsCode(sourceFile: ts.SourceFile): string {
    const printer = ts.createPrinter();
    return printer.printFile(sourceFile);
}

// 编译 TypeScript 代码为 JavaScript
function compileTsToJs(tsCode: string): string {
    const result = ts.transpileModule(tsCode, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            strict: true,
            esModuleInterop: true,
            preserveConstEnums: true,
            noEmitOnError: true,
            removeComments: false,
        },
    });
    console.log('result', result)
    // 检查编译结果
    if (result.diagnostics && result.diagnostics.length > 0) {
        result.diagnostics.forEach(diagnostic => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.error(`Error ${diagnostic.code}: ${message}`);
        });
    } else {
        console.log("Generated JavaScript Code:\n", result.outputText);
    }
    return result.outputText;
}

// 示例 JSON 产物
// const intermediateJson = { "nodes": [{ "id": "start-node", "shape": "start-node", "properties": { "name": "开始", "nodeType": "COMMON", "nodeId": "startComponent" }, "next": "a809c872-82f5-44a8-bf1e-f117cbffd652" }, { "id": "end-node", "shape": "end-node", "properties": { "name": "结束", "nodeId": "endComponent", "nodeType": "COMMON", "result": { "key": ["logic", "VT_aaa"], "name": "aaa", "dataType": "BOOLEAN", "secondDataType": "VOID", "value": "", "valueType": "FIXED" }, "iconColor": "#1382FF", "size": { "width": 220, "height": 100 } }, "next": null }, { "id": "354865da-c82d-4fca-a8c7-c344976910a7", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "dddd", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "dddd" } }, "next": "ec43883b-f725-436f-bd18-722b042ad05e" }, { "id": "a809c872-82f5-44a8-bf1e-f117cbffd652", "shape": "if-node", "properties": { "value": "${field.逻辑变量.aaa::logic.VT_aaa} > 1", "valueType": "EXPRESSION", "frontEndValue": { "valueType": "EXPRESSION", "value": "${field.逻辑变量.aaa::logic.VT_aaa} > 1" } }, "next": null, "conditionValue": "${field.逻辑变量.aaa::logic.VT_aaa} > 1", "conditionValueType": "EXPRESSION", "trueBranch": "354865da-c82d-4fca-a8c7-c344976910a7", "falseBranch": "4390f3b2-a957-4051-b98f-f86f18121e6a" }, { "id": "4390f3b2-a957-4051-b98f-f86f18121e6a", "shape": "end-node", "properties": { "name": "结束", "nodeId": "endComponent", "nodeType": "COMMON", "result": { "key": ["logic", "VT_aaa"], "name": "aaa", "dataType": "BOOLEAN", "value": "" }, "iconColor": "#1382FF", "size": { "width": 220, "height": 100 } }, "next": null }, { "id": "ec43883b-f725-436f-bd18-722b042ad05e", "shape": "switch-node", "properties": { "name": "匹配", "nodeId": "switchComponent", "nodeType": "SWITCH", "iconColor": "#1382FF", "size": { "width": 360, "height": 80 }, "widthUnit": 210, "inputWidth": 200, "value": "${field.逻辑变量.bbbb::logic.VT_bbbb}", "valueType": "EXPRESSION", "frontEndValue": { "valueType": "EXPRESSION", "value": "${field.逻辑变量.bbbb::logic.VT_bbbb}" } }, "next": null, "conditionValue": "${field.逻辑变量.bbbb::logic.VT_bbbb}", "conditionValueType": "EXPRESSION", "cases": [{ "conditionValue": "1", "next": "end-node" }, { "conditionValue": "2", "next": "de8d0cb0-56b3-4a7f-acf3-b0bf0c510953" }] }, { "id": "de8d0cb0-56b3-4a7f-acf3-b0bf0c510953", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "ccc", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "ccc" } }, "next": "end-node" }], "vars": [{ "varType": "LOCAL", "dataType": "BOOLEAN", "name": "aaa", "key": "VT_aaa" }, { "varType": "OUTPUT", "dataType": "NUMBER", "name": "bbbb", "key": "VT_bbbb" }, { "varType": "INPUT", "dataType": "BOOLEAN", "name": "p1", "key": "VT_p1" }, { "varType": "INPUT", "dataType": "NUMBER", "name": "p2", "key": "VT_p2" }] };
// const intermediateJson = { "nodes": [{ "id": "start-node", "shape": "start-node", "properties": { "name": "开始", "nodeType": "COMMON", "nodeId": "startComponent" }, "next": "8073dbef-ea1a-4f8c-a688-3b14e9b98a72" }, { "id": "end-node", "shape": "end-node", "properties": { "name": "结束", "nodeId": "endComponent", "nodeType": "COMMON", "result": { "key": [], "name": "", "dataType": "VOID", "secondDataType": "VOID", "value": "" }, "iconColor": "#1382FF", "size": { "width": 220, "height": 100 } }, "next": null }, { "id": "8073dbef-ea1a-4f8c-a688-3b14e9b98a72", "shape": "loop-node", "properties": { "loopList": "${field.逻辑变量.d::logic.VT_dd}", "loopObject": "item", "loopIndex": "index", "name": "循环列表", "nodeId": "iteratorComponent", "nodeType": "ITERATOR", "iconColor": "#1382FF", "size": { "width": 600, "height": 400 }, "frontEndLoopList": { "valueType": "EXPRESSION", "value": "${field.逻辑变量.d::logic.VT_dd}" } }, "next": "end-node", "body": ["02a8105b-54f6-4c2f-b1ef-7d97c2981567"], "bodyStart": "02a8105b-54f6-4c2f-b1ef-7d97c2981567" }, { "id": "02a8105b-54f6-4c2f-b1ef-7d97c2981567", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_vvv"], "value": "ggg", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "ggg" } }, "next": null }], "vars": [{ "varType": "INPUT", "dataType": "BOOLEAN", "name": "d", "key": "VT_dd" }, { "dataType": "BOOLEAN", "name": "vvv", "varType": "LOCAL", "key": "VT_vvv" }] }
// 错误的，循环节点body包含连线的例子： const intermediateJson = { "nodes": [{ "id": "start-node", "shape": "start-node", "properties": { "name": "开始", "nodeId": "startComponent", "nodeType": "COMMON" }, "next": "cad7cf9f-4af3-444d-b710-08b0d22e767e" }, { "id": "end-node", "shape": "end-node", "properties": { "name": "结束", "nodeId": "endComponent", "nodeType": "COMMON", "result": { "key": ["logic", "VT_aaa"], "name": "aaa", "dataType": "BOOLEAN", "value": "" }, "iconColor": "#1382FF", "size": { "width": 220, "height": 100 } }, "next": null }, { "id": "cad7cf9f-4af3-444d-b710-08b0d22e767e", "shape": "query-node", "properties": { "name": "查询记录", "nodeId": "selectEntity", "nodeType": "COMMON", "result": { "key": ["logic", "VT_aaa"], "name": "查询记录.记录", "dataType": "ENTITY", "value": "" }, "iconColor": "#00B85F", "size": { "width": 360, "height": 190 }, "objectId": "1840291241716224000", "entityId": { "valueType": "FIXED", "value": "123132123" } }, "next": "f5942907-878b-4b25-8258-29f40fd5319a" }, { "id": "f5942907-878b-4b25-8258-29f40fd5319a", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "bbb", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "bbb" } }, "next": "1435bd54-b459-4deb-9274-fbd94700c5ec" }, { "id": "1435bd54-b459-4deb-9274-fbd94700c5ec", "shape": "if-node", "properties": { "name": "条件判断", "nodeId": "ifComponent", "nodeType": "IF", "value": "${field.逻辑变量.aaa::logic.VT_aaa} === 'bbb'", "valueType": "EXPRESSION", "frontEndValue": { "valueType": "EXPRESSION", "value": "${field.逻辑变量.aaa::logic.VT_aaa} === 'bbb'" } }, "next": null, "conditionValue": "${field.逻辑变量.aaa::logic.VT_aaa} === 'bbb'", "conditionValueType": "EXPRESSION", "trueBranch": "03a5dbdf-2e0f-43ef-a349-8d60089ad4f5", "falseBranch": "120591fa-0e3c-428d-95ca-7b235d0fd2d4" }, { "id": "120591fa-0e3c-428d-95ca-7b235d0fd2d4", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "bbb", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "bbb" } }, "next": "203f2099-e759-4d16-84fb-028021564971" }, { "id": "03a5dbdf-2e0f-43ef-a349-8d60089ad4f5", "shape": "loop-node", "properties": { "name": "循环列表", "nodeId": "iteratorComponent", "nodeType": "ITERATOR", "iconColor": "#1382FF", "size": { "width": 900, "height": 400 } }, "next": "end-node", "body": ["84cbcadf-3d1f-40fd-860e-9e49c1a793be", "34474c86-ea2e-43b4-a57b-1d0dd3708f14", "73377451-64f3-4bf9-bd1c-f8b9febe3ce4"], "bodyStart": "84cbcadf-3d1f-40fd-860e-9e49c1a793be" }, { "id": "84cbcadf-3d1f-40fd-860e-9e49c1a793be", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "${field.全局变量.移动数字变量::global.VG_31414141225}", "dataType": "VOID", "valueType": "EXPRESSION", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "EXPRESSION", "value": "${field.全局变量.移动数字变量::global.VG_31414141225}" } }, "next": "34474c86-ea2e-43b4-a57b-1d0dd3708f14" }, { "id": "34474c86-ea2e-43b4-a57b-1d0dd3708f14", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "2222", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "2222" } }, "next": null }, { "id": "203f2099-e759-4d16-84fb-028021564971", "shape": "end-node", "properties": { "name": "结束", "nodeId": "endComponent", "nodeType": "COMMON", "result": { "key": ["logic", "VT_aaa"], "name": "aaa", "dataType": "BOOLEAN", "value": "" }, "iconColor": "#1382FF", "size": { "width": 220, "height": 100 } }, "next": null }], "vars": [{ "varType": "LOCAL", "dataType": "BOOLEAN", "name": "aaa", "key": "VT_aaa" }, { "varType": "OUTPUT", "dataType": "NUMBER", "name": "bbbb", "key": "VT_bbbb" }, { "varType": "INPUT", "dataType": "BOOLEAN", "name": "p1", "key": "VT_p1" }, { "varType": "INPUT", "dataType": "NUMBER", "name": "p2", "key": "VT_p2" }] }
// 错误的，循环中没有设置循环列表和列表项和index: const intermediateJson = { "nodes": [{ "id": "start-node", "shape": "start-node", "properties": { "name": "开始", "nodeId": "startComponent", "nodeType": "COMMON" }, "next": "cad7cf9f-4af3-444d-b710-08b0d22e767e" }, { "id": "end-node", "shape": "end-node", "properties": { "name": "结束", "nodeId": "endComponent", "nodeType": "COMMON", "result": { "key": ["logic", "VT_aaa"], "name": "aaa", "dataType": "BOOLEAN", "value": "" }, "iconColor": "#1382FF", "size": { "width": 220, "height": 100 } }, "next": null }, { "id": "cad7cf9f-4af3-444d-b710-08b0d22e767e", "shape": "query-node", "properties": { "name": "查询记录", "nodeId": "selectEntity", "nodeType": "COMMON", "result": { "key": ["logic", "VT_aaa"], "name": "查询记录.记录", "dataType": "ENTITY", "value": "" }, "iconColor": "#00B85F", "size": { "width": 360, "height": 190 }, "objectId": "1840291241716224000", "entityId": { "valueType": "FIXED", "value": "123132123" } }, "next": "f5942907-878b-4b25-8258-29f40fd5319a" }, { "id": "f5942907-878b-4b25-8258-29f40fd5319a", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "bbb", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "bbb" } }, "next": "1435bd54-b459-4deb-9274-fbd94700c5ec" }, { "id": "1435bd54-b459-4deb-9274-fbd94700c5ec", "shape": "if-node", "properties": { "name": "条件判断", "nodeId": "ifComponent", "nodeType": "IF", "value": "${field.逻辑变量.aaa::logic.VT_aaa} === 'bbb'", "valueType": "EXPRESSION", "frontEndValue": { "valueType": "EXPRESSION", "value": "${field.逻辑变量.aaa::logic.VT_aaa} === 'bbb'" } }, "next": null, "conditionValue": "${field.逻辑变量.aaa::logic.VT_aaa} === 'bbb'", "conditionValueType": "EXPRESSION", "trueBranch": "03a5dbdf-2e0f-43ef-a349-8d60089ad4f5", "falseBranch": "120591fa-0e3c-428d-95ca-7b235d0fd2d4" }, { "id": "120591fa-0e3c-428d-95ca-7b235d0fd2d4", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "bbb", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "bbb" } }, "next": "203f2099-e759-4d16-84fb-028021564971" }, { "id": "03a5dbdf-2e0f-43ef-a349-8d60089ad4f5", "shape": "loop-node", "properties": { "name": "循环列表", "nodeId": "iteratorComponent", "nodeType": "ITERATOR", "iconColor": "#1382FF", "size": { "width": 900, "height": 400 } }, "next": "end-node", "body": ["84cbcadf-3d1f-40fd-860e-9e49c1a793be", "34474c86-ea2e-43b4-a57b-1d0dd3708f14"], "bodyStart": "84cbcadf-3d1f-40fd-860e-9e49c1a793be" }, { "id": "84cbcadf-3d1f-40fd-860e-9e49c1a793be", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "${field.全局变量.移动数字变量::global.VG_31414141225}", "dataType": "VOID", "valueType": "EXPRESSION", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "EXPRESSION", "value": "${field.全局变量.移动数字变量::global.VG_31414141225}" } }, "next": "34474c86-ea2e-43b4-a57b-1d0dd3708f14" }, { "id": "34474c86-ea2e-43b4-a57b-1d0dd3708f14", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "2222", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "2222" } }, "next": null }, { "id": "203f2099-e759-4d16-84fb-028021564971", "shape": "end-node", "properties": { "name": "结束", "nodeId": "endComponent", "nodeType": "COMMON", "result": { "key": ["logic", "VT_aaa"], "name": "aaa", "dataType": "BOOLEAN", "value": "" }, "iconColor": "#1382FF", "size": { "width": 220, "height": 100 } }, "next": null }], "vars": [{ "varType": "LOCAL", "dataType": "BOOLEAN", "name": "aaa", "key": "VT_aaa" }, { "varType": "OUTPUT", "dataType": "NUMBER", "name": "bbbb", "key": "VT_bbbb" }, { "varType": "INPUT", "dataType": "BOOLEAN", "name": "p1", "key": "VT_p1" }, { "varType": "INPUT", "dataType": "NUMBER", "name": "p2", "key": "VT_p2" }] }
const intermediateJson = { "nodes": [{ "id": "start-node", "shape": "start-node", "properties": { "name": "开始", "nodeType": "COMMON", "nodeId": "startComponent" }, "next": "cad7cf9f-4af3-444d-b710-08b0d22e767e" }, { "id": "end-node", "shape": "end-node", "properties": { "name": "结束", "nodeId": "endComponent", "nodeType": "COMMON", "result": { "key": ["logic", "VT_aaa"], "name": "aaa", "dataType": "BOOLEAN", "secondDataType": "VOID", "value": "" }, "iconColor": "#1382FF", "size": { "width": 220, "height": 100 } }, "next": null }, { "id": "cad7cf9f-4af3-444d-b710-08b0d22e767e", "shape": "query-node", "properties": { "name": "查询记录", "nodeId": "selectEntity", "nodeType": "COMMON", "result": { "key": ["logic", "VT_aaa"], "name": "查询记录.记录", "dataType": "ENTITY", "value": "" }, "iconColor": "#00B85F", "size": { "width": 360, "height": 190 }, "entityId": { "valueType": "FIXED", "value": "123132123" }, "objectId": "1840291241716224000" }, "next": "f5942907-878b-4b25-8258-29f40fd5319a" }, { "id": "f5942907-878b-4b25-8258-29f40fd5319a", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "bbb", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "bbb" } }, "next": "1435bd54-b459-4deb-9274-fbd94700c5ec" }, { "id": "1435bd54-b459-4deb-9274-fbd94700c5ec", "shape": "if-node", "properties": { "name": "条件判断", "nodeId": "ifComponent", "nodeType": "IF", "iconColor": "#1382FF", "size": { "width": 360, "height": 80 }, "valueType": "EXPRESSION", "frontEndValue": { "valueType": "EXPRESSION", "value": "${field.逻辑变量.aaa::logic.VT_aaa} === 'bbb'" }, "value": "${field.逻辑变量.aaa::logic.VT_aaa} === 'bbb'" }, "next": null, "conditionValue": "${field.逻辑变量.aaa::logic.VT_aaa} === 'bbb'", "conditionValueType": "EXPRESSION", "trueBranch": "120591fa-0e3c-428d-95ca-7b235d0fd2d4", "falseBranch": "03a5dbdf-2e0f-43ef-a349-8d60089ad4f5" }, { "id": "120591fa-0e3c-428d-95ca-7b235d0fd2d4", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "bbb", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "bbb" } }, "next": "203f2099-e759-4d16-84fb-028021564971" }, { "id": "03a5dbdf-2e0f-43ef-a349-8d60089ad4f5", "shape": "loop-node", "properties": { "loopList": "${field.全局变量.布尔-服务端::global.VG_boolServer}", "loopObject": "item", "loopIndex": "index", "name": "循环列表", "nodeId": "iteratorComponent", "nodeType": "ITERATOR", "iconColor": "#1382FF", "size": { "width": 900, "height": 400 }, "frontEndLoopList": { "valueType": "EXPRESSION", "value": "${field.全局变量.布尔-服务端::global.VG_boolServer}" } }, "next": "34474c86-ea2e-43b4-a57b-1d0dd3708f14", "body": ["84cbcadf-3d1f-40fd-860e-9e49c1a793be", "34474c86-ea2e-43b4-a57b-1d0dd3708f14"], "bodyStart": "84cbcadf-3d1f-40fd-860e-9e49c1a793be" }, { "id": "84cbcadf-3d1f-40fd-860e-9e49c1a793be", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "${field.全局变量.移动数字变量::global.VG_31414141225}", "dataType": "VOID", "valueType": "EXPRESSION", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "EXPRESSION", "value": "${field.全局变量.移动数字变量::global.VG_31414141225}" } }, "next": "03a5dbdf-2e0f-43ef-a349-8d60089ad4f5" }, { "id": "34474c86-ea2e-43b4-a57b-1d0dd3708f14", "shape": "change-variable-node", "properties": { "name": "赋值节点", "nodeId": "changeVariable", "nodeType": "COMMON", "key": ["logic", "VT_aaa"], "value": "2222", "dataType": "VOID", "valueType": "FIXED", "iconColor": "#1382FF", "size": { "width": 360, "height": 160 }, "frontEndValue": { "valueType": "FIXED", "value": "2222" } }, "next": null }, { "id": "203f2099-e759-4d16-84fb-028021564971", "shape": "end-node", "properties": { "name": "结束", "nodeId": "endComponent", "nodeType": "COMMON", "result": { "key": ["logic", "VT_aaa"], "name": "aaa", "dataType": "BOOLEAN", "secondDataType": "VOID", "value": "" }, "iconColor": "#1382FF", "size": { "width": 220, "height": 100 } }, "next": null }], "vars": [{ "varType": "LOCAL", "dataType": "BOOLEAN", "name": "aaa", "key": "VT_aaa" }, { "varType": "OUTPUT", "dataType": "NUMBER", "name": "bbbb", "key": "VT_bbbb" }, { "varType": "INPUT", "dataType": "BOOLEAN", "name": "p1", "key": "VT_p1" }, { "varType": "INPUT", "dataType": "NUMBER", "name": "p2", "key": "VT_p2" }] }
// 生成 AST
const sourceFile = generateTsCode(intermediateJson);
console.log('sourceFile', sourceFile)
// 打印生成的 TypeScript 代码
const tsCode = printTsCode(sourceFile);
console.log("Generated TypeScript Code:\n", tsCode);

// 编译 TypeScript 代码为 JavaScript
const jsCode = compileTsToJs(tsCode);
// console.log("Generated JavaScript Code:\n", jsCode);