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
            const start = diagnostic.getStart();
            const length = diagnostic.getLength();

            if (start !== undefined && length !== undefined) {
                const { line, column } = sourceFile.getLineAndColumnAtPos(start);

                // 获取整个源代码文本
                const fullText = sourceFile.getFullText();

                // 找到当前行的起始和结束位置
                let lineStart = start;
                while (lineStart > 0 && fullText[lineStart - 1] !== '\n') {
                    lineStart--;
                }

                let lineEnd = start;
                while (lineEnd < fullText.length && fullText[lineEnd] !== '\n') {
                    lineEnd++;
                }

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