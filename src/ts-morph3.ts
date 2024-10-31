import { Project, ScriptTarget, ModuleKind, SourceFile, DiagnosticCategory, VariableDeclarationKind } from 'ts-morph';

// 基础接口定义
interface CodeSegment {
    handlerId: string;
    start: number;
    end: number;
}

interface TransformOperation {
    type: string;
    handlerId: string;
    config: any;
}

// 具体的转换操作类型
interface AddVariableOperation extends TransformOperation {
    type: 'addVariable';
    config: {
        declarationKind: VariableDeclarationKind;
        declarations: Array<{
            name: string;
            type?: string;
            initializer: string;
        }>;
    };
}

// 转换操作的类型守卫
function isAddVariableOperation(op: TransformOperation): op is AddVariableOperation {
    return op.type === 'addVariable';
}

// 源文件构建器
class SourceFileBuilder {
    private operations: TransformOperation[] = [];

    addTransformation(operation: TransformOperation): SourceFileBuilder {
        this.operations.push(operation);
        return this;
    }

    build(project: Project): SourceFile {
        const sourceFile = project.createSourceFile('test.ts', '', { overwrite: true });
        const codeSegments: CodeSegment[] = [];

        this.operations.forEach(operation => {
            const segment = applyTransformation(sourceFile, operation);
            codeSegments.push(segment);
        });

        (sourceFile as any).__codeSegments = codeSegments;
        return sourceFile;
    }
}

// 转换执行器
function applyTransformation(sourceFile: SourceFile, operation: TransformOperation): CodeSegment {
    const startPos = sourceFile.getEnd();

    if (isAddVariableOperation(operation)) {
        sourceFile.addVariableStatement(operation.config);
    }
    // 可以添加其他类型的转换操作

    return {
        handlerId: operation.handlerId,
        start: startPos,
        end: sourceFile.getEnd()
    };
}

// 节点处理函数
function handleNode1(): AddVariableOperation {
    return {
        type: 'addVariable',
        handlerId: 'handleNode1',
        config: {
            declarationKind: VariableDeclarationKind.Const,
            declarations: [{
                name: 'x',
                initializer: '"Hello"'
            }]
        }
    };
}

function handleNode2(): AddVariableOperation {
    return {
        type: 'addVariable',
        handlerId: 'handleNode2',
        config: {
            declarationKind: VariableDeclarationKind.Const,
            declarations: [{
                name: 'y',
                type: 'number',
                initializer: '"World"'
            }]
        }
    };
}

export function createTsSourceFileWithErrors(): SourceFile {
    const project = new Project({
        compilerOptions: {
            target: ScriptTarget.Latest,
            module: ModuleKind.CommonJS,
        }
    });

    const builder = new SourceFileBuilder();

    // 添加转换操作
    builder
        .addTransformation(handleNode1())
        .addTransformation(handleNode2());

    return builder.build(project);
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

                // 找到对应的处理器
                const handlerId = codeSegments.find(segment =>
                    start >= segment.start && start <= segment.end
                )?.handlerId || 'unknown';

                console.log(`${sourceFile.getFilePath()} (${line},${column}) [Handler: ${handlerId}]: ${category === DiagnosticCategory.Error ? 'Error' : 'Warning'}: ${message}`);
                console.log(`Problematic code: "${fullLine}"`);
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

    // 打印生成的 TypeScript 代码
    console.log("Generated TypeScript code with intentional errors:");
    console.log(sourceFile.getFullText());

    // 分析并打印诊断信息
    analyzeTsCode(sourceFile);

    // 生成并打印 JavaScript 代码
    const jsCode = generateJavaScript(sourceFile);
    console.log('Generated JavaScript code:');
    console.log(jsCode);
}

main();