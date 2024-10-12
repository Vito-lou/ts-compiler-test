import * as ts from 'typescript';

// 创建一个包含错误的 TypeScript AST
function createInvalidAST(): ts.SourceFile {
    const statements: ts.Statement[] = [];

    // 语法错误：缺少分号
    const variableStatement = ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ConstKeyword)],
        ts.factory.createVariableDeclarationList([
            ts.factory.createVariableDeclaration(
                ts.factory.createIdentifier("x"),
                undefined,
                undefined,
                ts.factory.createStringLiteral("Hello") // 这里是一个字符串
            )
        ], ts.NodeFlags.None)
    );

    statements.push(variableStatement);

    // 类型错误：将字符串赋值给数字
    const typeErrorStatement = ts.factory.createVariableStatement(
        [ts.factory.createModifier(ts.SyntaxKind.ConstKeyword)],
        ts.factory.createVariableDeclarationList([
            ts.factory.createVariableDeclaration(
                ts.factory.createIdentifier("y"),
                undefined,
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword), // 期望是数字
                ts.factory.createStringLiteral("World") // 实际是字符串
            )
        ], ts.NodeFlags.None)
    );

    statements.push(typeErrorStatement);

    // 创建源文件
    return ts.factory.createSourceFile(statements, ts.factory.createToken(ts.SyntaxKind.EndOfFileToken), ts.NodeFlags.None);
}

// 编译 TypeScript 代码并捕获 diagnostics
function compileTsCode(sourceFile: ts.SourceFile): void {
    console.log('sourceFile', sourceFile)
    const program = ts.createProgram({
        rootNames: [sourceFile.fileName],
        options: {
            noEmit: true, // 不生成输出文件
            strict: true, // 启用严格模式
        },
    });
    const emitResult = program.emit(sourceFile);
    console.log('emitResult', emitResult)
    // 获取诊断信息
    const diagnostics = ts.getPreEmitDiagnostics(program);
    console.log('diagnostics', diagnostics)
    // 检查编译结果
    if (diagnostics.length > 0) {
        diagnostics.forEach(diagnostic => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.error(`Error ${diagnostic.code}: ${message}`);
        });
    } else {
        console.log("No diagnostics found.");
    }
}

// 测试生成和编译
const sourceFile = createInvalidAST();
sourceFile.fileName = 'test.ts'
compileTsCode(sourceFile);