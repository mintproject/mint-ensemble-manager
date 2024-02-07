import { IdNameObject, IdMap } from "../mint/mint-types";

/* Defining all Wings Types */
export interface WingsTemplatePackage {
    template: WingsTemplate;
    constraints: WingsTemplateConstraint[];
}
export interface WingsTemplateConstraint {
    subject: any;
    predicate: any;
    object: any;
}
export interface WingsTemplate extends IdNameObject {
    Nodes: IdMap<WingsNode>;
    Links: IdMap<WingsLink>;
    Variables: IdMap<WingsDataVariable | WingsParameterVariable>;
    inputRoles: IdMap<WingsPortRole>;
    outputRoles: IdMap<WingsPortRole>;

    version: number;
    onturl: string;
    wflowns: string;
    props: Object;
    rules: Object;
    subtemplates: Object;
    metadata: WingsTemplateMetadata;
}
export interface WingsTemplateMetadata {
    contributors: string[];
    createdFrom: string[];
    lastUpdateTime: string;
    documentation: string;
}
export interface WingsNode extends IdNameObject {
    inputPorts: IdMap<WingsPort>;
    outputPorts: IdMap<WingsPort>;
    componentVariable: WingsComponentVariable;
    crule: WingsNodeRule;
    prule: WingsNodeRule;
}
export interface WingsNodeRule {
    type: "STYPE" | "WTYPE";
    expr?: WingsNodeRuleExpression;
}
export interface WingsNodeRuleExpression {
    op?: "XPRODUCT" | "NWISE" | "SHIFT" | "REDUCEDIM" | "INCREASEDIM";
    args?: string[] | WingsNodeRuleExpression[];
}

export interface WingsVariable extends IdNameObject {
    type: number;
    comment: string;
    binding: URIBinding | URIBinding[] | ValueBinding | ValueBinding[];
    autofill: boolean;
    breakpoint: boolean;
}

export interface WingsDataVariable extends WingsVariable {
    type: 1;
    unknown?: boolean;
    inactive?: boolean;
    derivedFrom?: string;
    binding: URIBinding[] | URIBinding;
}

export interface WingsParameterVariable extends WingsVariable {
    type: 2;
    unknown?: boolean;
    inactive?: boolean;
    derivedFrom?: string;
    binding: ValueBinding[] | ValueBinding;
}

export interface WingsComponentVariable extends WingsVariable {
    type: 3;
    isConcrete: boolean;
    binding: URIBinding;
}

export interface WingsComponent extends IdNameObject {
    type: number;
    binding: URIBinding;
    inputs: WingsComponentArgument[];
    outputs: WingsComponentArgument[];
    rules: string[];
    inheritedRules: string[];
    requirement: WingsComponentRequirement;
}
export interface WingsComponentArgument extends IdNameObject {
    type: string;
    role: string;
    prefix: string;
    isParam?: boolean;
    dimensionality?: number;
    paramDefaultValue?: any;
}
export interface WingsComponentRequirement {
    storageGB: number;
    memoryGB: number;
    needs64bit: boolean;
    softwareIds: string[];
}

export interface WingsPort extends IdNameObject {
    role: WingsPortRole;
}
export interface WingsPortRole extends IdNameObject {
    type: number;
    roleid: string;
    dimensionality?: number;
}

export interface WingsLink extends IdNameObject {
    fromNode?: IdNameObject;
    toNode?: IdNameObject;
    fromPort?: IdNameObject;
    toPort?: IdNameObject;
    variable?: IdNameObject;
}

export interface URIBinding extends IdNameObject {
    type: string;
}
export interface ValueBinding {
    type: string;
    value: any;
}

export interface WingsPlannerResults {
    success: boolean;
    data: WingsPlannerData;
}
export interface WingsPlannerData {
    explanations: string[];
    error: boolean;
}
export interface WingsPlannerExpansionsResults extends WingsPlannerResults {
    data: WingsWorkflowExpansions;
}
export interface WingsWorkflowExpansions extends WingsPlannerData {
    seed: WingsTemplatePackage;
    templates: WingsTemplatePackage[];
}

export interface WingsDataBindings {
    [inputid: string]: string[];
}
export interface WingsParameterBindings {
    [inputid: string]: string;
}
export interface WingsParameterTypes {
    [inputid: string]: string;
}

export interface WingsTemplateSeed {
    tid?: string;
    datasets: any;
    parameters: any;
    paramtypes: any;
}
