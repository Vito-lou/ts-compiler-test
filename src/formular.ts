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
        [ts.factory.createModifier(ts.SyntaxKind.ConstKeyword)],
        ts.factory.createVariableDeclarationList(
            [
                ts.factory.createVariableDeclaration(
                    ts.factory.createIdentifier(variableName),
                    undefined,
                    undefined,
                    valueExpression // 使用生成的值表达式
                )
            ],
            ts.NodeFlags.None
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
    const trueBranch = ts.factory.createBlock([
        ts.factory.createExpressionStatement(ts.factory.createCallExpression(
            ts.factory.createIdentifier('console.log'),
            undefined,
            [ts.factory.createStringLiteral('True branch executed')] // 使用 createStringLiteral
        ))
    ]);

    const falseBranch = ts.factory.createBlock([
        ts.factory.createExpressionStatement(ts.factory.createCallExpression(
            ts.factory.createIdentifier('console.log'),
            undefined,
            [ts.factory.createStringLiteral('False branch executed')] // 使用 createStringLiteral
        ))
    ]);

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

    for (const node of intermediateJson.nodes) {
        switch (node.shape) {
            case 'change-variable-node':
                statements.push(handleChangeVariableNode(node, context));
                break;
            case 'if-node':
                statements.push(handleIfNode(node, context, formulaEditor));
                break;
            case 'switch-node':
                statements.push(handleSwitchNode(node, context));
                break;
            // 其他节点类型的处理...
            default:
                console.warn(`未处理的节点类型: ${node.shape}`);
        }
    }
    // console.log('statements', JSON.stringify(statements))
    return ts.factory.createSourceFile(statements, ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);
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
            target: ts.ScriptTarget.ES2015,
            strict: true,
            esModuleInterop: true,
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
const intermediateJson = {"nodes":[{"id":"start-node","shape":"start-node","properties":{"name":"开始","nodeType":"COMMON","nodeId":"startComponent"},"next":"a809c872-82f5-44a8-bf1e-f117cbffd652"},{"id":"end-node","shape":"end-node","properties":{"name":"结束","nodeId":"endComponent","nodeType":"COMMON","result":{"key":["logic","VT_aaa"],"name":"aaa","dataType":"BOOLEAN","secondDataType":"VOID","value":"","valueType":"FIXED"},"iconColor":"#1382FF","size":{"width":220,"height":100}},"next":null},{"id":"354865da-c82d-4fca-a8c7-c344976910a7","shape":"change-variable-node","properties":{"name":"赋值节点","nodeId":"changeVariable","nodeType":"COMMON","key":["logic","VT_aaa"],"value":"dddd","dataType":"VOID","valueType":"FIXED","iconColor":"#1382FF","size":{"width":360,"height":160},"frontEndValue":{"valueType":"FIXED","value":"dddd"}},"next":"ec43883b-f725-436f-bd18-722b042ad05e"},{"id":"a809c872-82f5-44a8-bf1e-f117cbffd652","shape":"if-node","properties":{"value":"${field.逻辑变量.aaa::logic.VT_aaa} > 1","valueType":"EXPRESSION","frontEndValue":{"valueType":"EXPRESSION","value":"${field.逻辑变量.aaa::logic.VT_aaa} > 1"}},"next":null,"conditionValue":"${field.逻辑变量.aaa::logic.VT_aaa} > 1","conditionValueType":"EXPRESSION","trueBranch":"354865da-c82d-4fca-a8c7-c344976910a7","falseBranch":"4390f3b2-a957-4051-b98f-f86f18121e6a"},{"id":"4390f3b2-a957-4051-b98f-f86f18121e6a","shape":"end-node","properties":{"name":"结束","nodeId":"endComponent","nodeType":"COMMON","result":{"key":["logic","VT_aaa"],"name":"aaa","dataType":"BOOLEAN","value":""},"iconColor":"#1382FF","size":{"width":220,"height":100}},"next":null},{"id":"ec43883b-f725-436f-bd18-722b042ad05e","shape":"switch-node","properties":{"name":"匹配","nodeId":"switchComponent","nodeType":"SWITCH","iconColor":"#1382FF","size":{"width":360,"height":80},"widthUnit":210,"inputWidth":200,"value":"${field.逻辑变量.bbbb::logic.VT_bbbb}","valueType":"EXPRESSION","frontEndValue":{"valueType":"EXPRESSION","value":"${field.逻辑变量.bbbb::logic.VT_bbbb}"}},"next":null,"conditionValue":"${field.逻辑变量.bbbb::logic.VT_bbbb}","conditionValueType":"EXPRESSION","cases":[{"conditionValue":"1","next":"end-node"},{"conditionValue":"2","next":"de8d0cb0-56b3-4a7f-acf3-b0bf0c510953"}]},{"id":"de8d0cb0-56b3-4a7f-acf3-b0bf0c510953","shape":"change-variable-node","properties":{"name":"赋值节点","nodeId":"changeVariable","nodeType":"COMMON","key":["logic","VT_aaa"],"value":"ccc","dataType":"VOID","valueType":"FIXED","iconColor":"#1382FF","size":{"width":360,"height":160},"frontEndValue":{"valueType":"FIXED","value":"ccc"}},"next":"end-node"}],"vars":[{"varType":"LOCAL","dataType":"BOOLEAN","name":"aaa","key":"VT_aaa"},{"varType":"OUTPUT","dataType":"NUMBER","name":"bbbb","key":"VT_bbbb"},{"varType":"INPUT","dataType":"BOOLEAN","name":"p1","key":"VT_p1"},{"varType":"INPUT","dataType":"NUMBER","name":"p2","key":"VT_p2"}]};

// 生成 AST
const sourceFile = generateTsCode(intermediateJson);
console.log('sourceFile', sourceFile)
// 打印生成的 TypeScript 代码
const tsCode = printTsCode(sourceFile);
console.log("Generated TypeScript Code:\n", tsCode);

// 编译 TypeScript 代码为 JavaScript
const jsCode = compileTsToJs(tsCode);
// console.log("Generated JavaScript Code:\n", jsCode);