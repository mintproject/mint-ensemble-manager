import { createJobFileInputsFromSeed } from "../jobs";
import seeds from "./fixtures/seeds";
import app from "./fixtures/app";
import jobFileInputsExpected from "./expected/jobFileInputs";

test("test create job file inputs from seed", () => {
    const jobInputs = createJobFileInputsFromSeed(seeds[0], app);
    expect(jobInputs).toEqual(jobFileInputsExpected);
});
