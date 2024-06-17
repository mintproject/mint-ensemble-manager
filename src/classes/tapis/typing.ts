import {
    ComponentDataBindings,
    ComponentParameterBindings,
    ComponentParameterTypes
} from "../localex/local-execution-types";
import { Execution } from "../mint/mint-types";

export type TapisComponent = {
    appId: string;
    appVersion: string;
    type: string;
};

export interface TapisComponentSeed {
    component: TapisComponent;
    execution: Execution;
    datasets: ComponentDataBindings;
    parameters: ComponentParameterBindings;
    paramtypes: ComponentParameterTypes;
    tapisAppId?: string;
    tapisAppVersion?: string;
}
