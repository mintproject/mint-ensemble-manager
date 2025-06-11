import { ModelOutput } from "@/classes/mint/mint-types";

export default [
    {
        position: 1,
        model_io: {
            __typename: "model_io",
            id: "https://w3id.org/okn/i/mint/modflow_2005_BartonSprings_avg_list",
            name: "flame length",
            type: "https://w3id.org/wings/export/MINT#MODFLOWlst",
            format: "tif",
            variables: []
        }
    },
    {
        __typename: "model_output",
        position: 2,
        model_io: {
            __typename: "model_io",
            id: "https://w3id.org/okn/i/mint/modflow_2005_BartonSprings_avg_cbb",
            name: "cbb",
            type: "https://w3id.org/wings/export/MINT#MODFLOWcbb",
            format: "cbb",
            variables: []
        }
    },
    {
        position: 3,
        model_io: {
            id: "https://w3id.org/okn/i/mint/modflow_2005_BartonSprings_avg_heads",
            name: "hds",
            type: "https://w3id.org/wings/export/MINT#MODFLOWhds",
            format: "hds",
            variables: []
        }
    },
    {
        position: 4,
        model_io: {
            id: "https://w3id.org/okn/i/mint/modflow_2005_BartonSprings_avg_ddown",
            name: "ddn",
            type: "https://w3id.org/wings/export/MINT#MODFLOWddn",
            format: "ddn",
            variables: []
        }
    },
    {
        position: 5,
        model_io: {
            __typename: "model_io",
            id: "https://w3id.org/okn/i/mint/time_of_arrival_0000001_0048011",
            name: "time_of_arrival",
            type: "https://w3id.org/wings/export/MINT#TimeOfArrival",
            format: "tif",
            variables: []
        }
    },
    {
        position: 6,
        model_io: {
            __typename: "model_io",
            id: "https://w3id.org/okn/i/mint/flin_0000001_0048011",
            name: "flin",
            type: "https://w3id.org/wings/export/MINT#FlameLength",
            format: "tif",
            variables: []
        }
    }
] as ModelOutput[];
