import {
    Project,
    SourceFile,
    VariableDeclarationKind,
    DiagnosticCategory,
    StatementStructures,
    VariableStatementStructure,
    ObjectLiteralExpression,
    Writers,
    CodeBlockWriter
} from 'ts-morph';

interface IParam {
    key: string;
    value: any;
    valueType: string;
}

// ================ Types ================
interface IIntermediateNode {
    id: string;
    shape: string;
    next?: string;
    data?: any;
}

interface CodeSegment {
    nodeId: string;
    start: number;
    end: number;
    type: string;
}

interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

// AST Operations
interface AstOperation {
    type: string;
    nodeId: string;
    config?: Record<string, any>;
}

interface AddStatementsOperation extends AstOperation {
    type: 'addStatements';
    config: {
        statements: string | WriterFunction | (string | WriterFunction)[];
    };
}

type WriterFunction = (writer: CodeBlockWriter) => void;

// ================ Context ================
class Context {
    private project: Project;
    private sourceFile: SourceFile;
    private intermediateJson: any;
    private variables: Map<string, string>;

    constructor(intermediateJson: any) {
        this.project = new Project({
            useInMemoryFileSystem: true,
            skipFileDependencyResolution: true
        });

        this.sourceFile = this.project.createSourceFile('output.ts', '', { overwrite: true });
        this.intermediateJson = intermediateJson;
        this.variables = new Map();
    }

    getSourceFile(): SourceFile {
        return this.sourceFile;
    }

    getIntermediateJson(): any {
        return this.intermediateJson;
    }

    setVariable(key: string, value: string): void {
        this.variables.set(key, value);
    }

    getVariable(key: string): string | undefined {
        return this.variables.get(key);
    }
}

// ================ Node Handlers ================
abstract class BaseNodeHandler<T = any> {
    protected abstract readonly handlerName: string;

    abstract validateProperties(props: any): props is T;
    protected abstract handleValidatedNode(properties: T, context: Context): AstOperation[];

    handle(node: IIntermediateNode, context: Context): AstOperation[] {
        if (!this.validateProperties(node.data)) {
            throw new Error(`${this.handlerName}: Invalid properties`);
        }
        return this.handleValidatedNode(node.data, context);
    }
}

interface IStartNodeProperties {
    // 开始节点通常不需要特殊属性
}

class StartNodeHandler extends BaseNodeHandler<IStartNodeProperties> {
    protected readonly handlerName = '开始节点处理器';

    validateProperties(props: any): props is IStartNodeProperties {
        // 开始节点不需要特殊的属性验证
        return true;
    }

    protected handleValidatedNode(properties: IStartNodeProperties, context: Context): AstOperation[] {
        // 开始节点不生成任何代码
        return [];
    }
}

interface IChangeVariableNodeProperties {
    key: string[];
    value: any;
    valueType: string;
}
class ChangeVariableNodeHandler extends BaseNodeHandler<IChangeVariableNodeProperties> {
    protected readonly handlerName = '修改变量节点处理器';

    validateProperties(props: any): props is IChangeVariableNodeProperties {
        return (
            props &&
            Array.isArray(props.key) &&
            typeof props.value === 'string' &&
            typeof props.valueType === 'string'
        );
    }

    protected handleValidatedNode(properties: IChangeVariableNodeProperties, context: Context): AstOperation[] {
        const { key, value, valueType } = properties;
        const variableName = key[1];  // 假设 key[1] 是变量名

        return [{
            type: 'addStatements',
            nodeId: 'change-variable',
            config: {
                statements: (writer: CodeBlockWriter) => {
                    // 故意制造类型错误：将数字赋值给字符串类型的变量
                    if (valueType === 'string') {
                        writer.writeLine(`let ${variableName}: string;`);
                        writer.writeLine(`${variableName} = 42;`);  // 类型错误！
                    } else {
                        writer.writeLine(`${variableName} = ${this.convertValue(value, valueType)};`);
                    }
                }
            }
        }];
    }

    private convertValue(value: any, valueType: string): string {
        switch (valueType.toLowerCase()) {
            case 'string':
                return `"${value}"`;
            case 'number':
                return value.toString();
            case 'boolean':
                return value ? 'true' : 'false';
            default:
                return 'undefined';
        }
    }
}
// Call Logic Node Handler
interface ICallLogicNodeProperties {
    chainId: string;
    params: IParam[];
    result: {
        key: string[];
    };
}

class CallLogicNodeHandler extends BaseNodeHandler<ICallLogicNodeProperties> {
    protected readonly handlerName = '调用逻辑节点处理器';
    private static paramCounter = 0;

    validateProperties(props: any): props is ICallLogicNodeProperties {
        return (
            props &&
            typeof props.chainId === 'string' &&
            (!props.params || (Array.isArray(props.params) &&
                props.params.every((param: IParam) => typeof param.key === 'string' && typeof param.valueType === 'string'))) &&
            (!props.result || (props.result &&
                Array.isArray(props.result.key)))
        );
    }

    // 在 CallLogicNodeHandler 中的 handleValidatedNode 方法里，修改 writer 的使用方式：
    protected handleValidatedNode(properties: ICallLogicNodeProperties, context: Context): AstOperation[] {
        const { chainId, params = [], result } = properties;

        return [{
            type: 'addStatements',
            nodeId: 'call-logic',
            config: {
                statements: (writer: CodeBlockWriter) => {
                    // 处理参数
                    params.forEach((param: IParam, index: number) => {
                        const paramVarName = `paramValue_${CallLogicNodeHandler.paramCounter++}`;
                        if (param.value !== undefined && param.valueType !== undefined) {
                            writer.writeLine(`const ${paramVarName} = ${this.convertValue(param.value, param.valueType)};`);
                        }
                    });

                    // 创建请求配置
                    writer.write(`const requestConfig = `).block(() => {
                        writer.writeLine(`method: 'post',`);
                        writer.writeLine(`url: '/api/logic-engine/chain/submit',`);
                        writer.write(`data: `).block(() => {
                            writer.writeLine(`chainId: '${chainId}',`);
                            writer.write(`param: `).block(() => {
                                params.forEach((param: IParam, index: number) => {
                                    const paramVarName = `paramValue_${index}`;
                                    writer.write(`${param.key}: ${paramVarName}`);
                                    if (index < params.length - 1) {
                                        writer.write(`,`);
                                    }
                                    writer.newLine();
                                });
                            });
                        });
                    }).newLine();

                    // 创建请求调用
                    if (result && result.key.length > 0) {
                        writer.writeLine(`${result.key[result.key.length - 1]} = await window.request(requestConfig);`);
                    } else {
                        writer.writeLine(`await window.request(requestConfig);`);
                    }
                }
            }
        }];
    }

    private convertValue(value: any, valueType: string): string {
        switch (valueType.toLowerCase()) {
            case 'string':
                return `"${value}"`;
            case 'number':
                return value.toString();
            case 'boolean':
                return value ? 'true' : 'false';
            case 'object':
                return JSON.stringify(value);
            default:
                return 'undefined';
        }
    }
}

// ================ AST Transformer ================
class AstTransformer {
    private sourceFile: SourceFile;
    private codeSegments: CodeSegment[] = [];

    constructor(sourceFile: SourceFile) {
        this.sourceFile = sourceFile;
    }

    applyOperation(operation: AstOperation): CodeSegment {
        const startPos = this.sourceFile.getEnd();

        switch (operation.type) {
            case 'addStatements':
                const op = operation as AddStatementsOperation;
                this.sourceFile.addStatements(op.config.statements);
                break;
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }

        const segment = {
            nodeId: operation.nodeId,
            start: startPos,
            end: this.sourceFile.getEnd(),
            type: operation.type
        };

        this.codeSegments.push(segment);
        return segment;
    }

    getCodeSegments(): CodeSegment[] {
        return this.codeSegments;
    }
}

// ================ Code Generator ================
class CodeGenerator {
    private context: Context;
    private transformer: AstTransformer;
    private handlers: Map<string, BaseNodeHandler> = new Map();

    constructor(context: Context) {
        this.context = context;
        this.transformer = new AstTransformer(context.getSourceFile());

        // 注册处理器
        this.handlers.set('start-node', new StartNodeHandler());
        this.handlers.set('call-logic-node', new CallLogicNodeHandler());
        this.handlers.set('change-variable-node', new ChangeVariableNodeHandler());
    }

    generate(): void {
        const startNode = this.findStartNode();
        if (!startNode) {
            throw new Error('Start node not found');
        }

        this.processNode(startNode);
    }

    private processNode(node: IIntermediateNode): void {
        const handler = this.handlers.get(node.shape);
        if (!handler) {
            throw new Error(`Unknown node type: ${node.shape}`);
        }

        const operations = handler.handle(node, this.context);
        console.log('what operations', operations);
        operations.forEach(op => this.transformer.applyOperation(op));

        if (node.next) {
            const nextNode = this.findNodeById(node.next);
            if (nextNode) {
                this.processNode(nextNode);
            }
        }
    }

    private findStartNode(): IIntermediateNode | undefined {
        return this.context.getIntermediateJson().nodes
            .find((node: IIntermediateNode) => node.shape === 'start-node');
    }

    private findNodeById(id: string): IIntermediateNode | undefined {
        return this.context.getIntermediateJson().nodes
            .find((node: IIntermediateNode) => node.id === id);
    }

    getDiagnostics(): Array<{ nodeId: string; category: string; message: string }> {
        const diagnostics = this.context.getSourceFile().getPreEmitDiagnostics();
        const segments = this.transformer.getCodeSegments();
        const results: Array<{ nodeId: string; category: string; message: string }> = [];

        diagnostics.forEach(diagnostic => {
            const message = diagnostic.getMessageText();
            const category = diagnostic.getCategory();
            const start = diagnostic.getStart();

            if (start !== undefined) {
                const segment = segments.find(s =>
                    start >= s.start && start <= s.end
                );

                results.push({
                    nodeId: segment?.nodeId || 'unknown',
                    category: category === DiagnosticCategory.Error ? 'Error' : 'Warning',
                    message: typeof message === 'string' ? message : message.getMessageText()
                });
            }
        });

        return results;
    }

    getGeneratedCode(): string {
        return this.context.getSourceFile().getFullText();
    }
}

// ================ Usage Example ================
const intermediateJson = {
    nodes: [
        {
            id: 'start1',
            shape: 'start-node',
            next: 'call1'
        },
        {
            id: 'var1',
            shape: 'change-variable-node',
            data: {
                key: ['variables', 'message'],
                value: "Hello",
                valueType: 'string'
            },
            next: 'call1'
        },
        {
            id: 'call1',
            shape: 'call-logic-node',
            data: {
                chainId: 'test-chain-001',
                params: [
                    {
                        key: 'message',
                        value: 'Hello World',
                        valueType: 'string'
                    },
                    {
                        key: 'count',
                        value: 42,
                        valueType: 'number'
                    }
                ],
                result: {
                    key: ['response']
                }
            }
        }
    ]
};

const context = new Context(intermediateJson);
const generator = new CodeGenerator(context);

try {
    generator.generate();
    console.log('Generated code:');
    console.log(generator.getGeneratedCode());
    console.log('Diagnostics:', generator.getDiagnostics());

} catch (error) {
    console.error('Generation failed:', error);
}