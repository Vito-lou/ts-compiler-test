import { Project, ScriptTarget, ModuleKind, SourceFile, DiagnosticCategory, VariableDeclarationKind } from 'ts-morph';

interface PropertyConfig {
    name: string;
    type: string;
    value: any;
    codePosition: {
        start: number;
        end: number;
    };
}

interface CodeSegment {
    handlerId: string;
    nodeId?: string;
    start: number;
    end: number;
    properties?: PropertyConfig[];
}

export function createTsSourceFileWithErrors(): SourceFile {
    const project = new Project({
        compilerOptions: {
            target: ScriptTarget.Latest,
            module: ModuleKind.CommonJS,
        }
    });

    const sourceFile = project.createSourceFile('test.ts', '', { overwrite: true });
    const codeSegments: CodeSegment[] = [];

    handleNode1(sourceFile, codeSegments);
    handleNode2(sourceFile, codeSegments);
    handleObjectNode(sourceFile, codeSegments);  // 新增
    (sourceFile as any).__codeSegments = codeSegments;

    return sourceFile;
}

function handleNode1(sourceFile: SourceFile, codeSegments: CodeSegment[]) {
    const startPos = sourceFile.getEnd();

    sourceFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        declarations: [{
            name: 'x',
            initializer: '"Hello"'
        }]
    });

    codeSegments.push({
        handlerId: 'handleNode1',
        start: startPos,
        end: sourceFile.getEnd()
    });
}

function handleNode2(sourceFile: SourceFile, codeSegments: CodeSegment[]) {
    const startPos = sourceFile.getEnd();

    sourceFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        declarations: [{
            name: 'y',
            type: 'number',
            initializer: '"World"'
        }]
    });

    codeSegments.push({
        handlerId: 'handleNode2',
        start: startPos,
        end: sourceFile.getEnd()
    });
}

function handleObjectNode(sourceFile: SourceFile, codeSegments: CodeSegment[]) {
    const startPos = sourceFile.getEnd();
    const properties: PropertyConfig[] = [];

    // 假设这是从配置中读取的对象属性
    const objectConfig = {
        properties: [
            { name: 'isActive', type: 'boolean', value: '"true"' },  // 故意制造类型错误
            { name: 'name', type: 'string', value: '"John"' }
        ]
    };

    // 先生成完整的对象字面量文本
    const objectLiteral = `{
        ${objectConfig.properties.map(prop => `${prop.name}: ${prop.value}`).join(',\n        ')}
    }`;

    // 添加变量声明
    sourceFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        declarations: [{
            name: 'obj',
            type: '{ isActive: boolean; name: string }',
            initializer: objectLiteral
        }]
    });

    // 获取生成后的完整文本
    const fullText = sourceFile.getFullText();
    const addedCode = fullText.slice(startPos);

    // 为每个属性计算位置
    objectConfig.properties.forEach(prop => {
        const propText = `${prop.name}: ${prop.value}`;
        const propIndex = addedCode.indexOf(propText);
        if (propIndex !== -1) {
            properties.push({
                name: prop.name,
                type: prop.type,
                value: prop.value,
                codePosition: {
                    start: startPos + propIndex,
                    end: startPos + propIndex + propText.length
                }
            });
        }
    });

    codeSegments.push({
        handlerId: 'handleObjectNode',
        nodeId: 'obj_001',
        start: startPos,
        end: sourceFile.getEnd(),
        properties
    });
}

export function analyzeTsCode(sourceFile: SourceFile): void {
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    const codeSegments: CodeSegment[] = (sourceFile as any).__codeSegments || [];

    if (diagnostics.length > 0) {
        diagnostics.forEach(diagnostic => {
            const message = diagnostic.getMessageText();
            const category = diagnostic.getCategory();
            const start = diagnostic.getStart(); //得到的是从文件开始的字符偏移量（character offset），不是行数也不是列数。
            console.log('start', start);
            if (start !== undefined) {
                const { line, column } = sourceFile.getLineAndColumnAtPos(start); //将这个偏移量转换为实际的行号和列号
                console.log('line', line);
                console.log('column', column);
                // 获取整个源代码文本
                const fullText = sourceFile.getFullText();

                /**
                 * 前置知识：
                 * 当我们使用 sourceFile.addVariableStatement() 时，ts-morph 会自动在语句之间添加换行符
这是标准的代码格式化行为，确保生成的代码是可读的
在 Unix/Linux/Mac 系统中使用 \n，在 Windows 系统中可能使用 \r\n，但 ts-morph 会统一处理这种差异
所以当我们在寻找行的边界时，可以确定：
除了第一行，每行的开始位置一定是一个换行符
这就是为什么我们在向左搜索行首时，是在找前一个换行符的位置
                 */
                // 找到当前行的起始和结束位置
                let lineStart = start;
                // lineStart > 0 是防止越过文件开头，如果不加这个判断，当start为0时，lineStart--会导致数组越界
                while (lineStart > 0 && fullText[lineStart - 1] !== '\n') {
                    lineStart--;
                }

                let lineEnd = start;
                // 向右找行尾时，防止越过文件结尾
                while (lineEnd < fullText.length && fullText[lineEnd] !== '\n') {
                    lineEnd++;
                }
                // lineStart 和 lineEnd 是字符偏移量。 因为fullText是字符串，所以可以用slice来截取字符串
                // 目标是截取出错的所在行
                const fullLine = fullText.slice(lineStart, lineEnd).trim();

                // 找到对应的代码段
                const segment = codeSegments.find(seg =>
                    start >= seg.start && start <= seg.end
                );

                if (segment) {
                    console.log(`${sourceFile.getFilePath()} (${line},${column}) [Handler: ${segment.handlerId}]: ${category === DiagnosticCategory.Error ? 'Error' : 'Warning'}: ${message}`);
                    console.log(`Problematic code: "${fullLine}"`);

                    // 如果存在属性信息，输出更详细的错误信息
                    if (segment.properties) {
                        const problematicProp = segment.properties.find(prop =>
                            start >= prop.codePosition.start && start <= prop.codePosition.end
                        );
                        console.log('problemprop', problematicProp);
                        if (problematicProp) {
                            console.log(`Detailed property information:`);
                            console.log(`- Node ID: ${segment.nodeId}`);
                            console.log(`- Property name: ${problematicProp.name}`);
                            console.log(`- Expected type: ${problematicProp.type}`);
                            console.log(`- Actual value: ${problematicProp.value}`);
                        }
                    }
                } else {
                    console.log(`${sourceFile.getFilePath()} (${line},${column}): ${category === DiagnosticCategory.Error ? 'Error' : 'Warning'}: ${message}`);
                    console.log(`Problematic code: "${fullLine}"`);
                }
            } else {
                console.log(`${category === DiagnosticCategory.Error ? 'Error' : 'Warning'}: ${message}`);
            }
        });
    } else {
        console.log("No diagnostics found.");
    }
}

export function generateJavaScript(sourceFile: SourceFile): string {
    return sourceFile.getEmitOutput().getOutputFiles()[0].getText();
}

function main() {
    const sourceFile = createTsSourceFileWithErrors();
    console.log('sourcefile', sourceFile);
    // Print the generated TypeScript code
    console.log("Generated TypeScript code with intentional errors:");
    console.log(sourceFile.getFullText());

    // Analyze and print diagnostics
    analyzeTsCode(sourceFile);

    // Generate and print JavaScript code
    const jsCode = generateJavaScript(sourceFile);
    console.log('Generated JavaScript code:');
    console.log(jsCode);
}

main();