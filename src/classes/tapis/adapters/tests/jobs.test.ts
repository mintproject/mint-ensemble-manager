import { createJobRequest } from "../jobs";
import seeds from "./fixtures/seeds";
import app from "./fixtures/app";
import model from "./fixtures/model";
import jobFileInputsExpected from "./expected/jobFileInputs";

test("test create job file inputs from seed", () => {
    const jobInputs = createJobRequest(app, seeds[0], model);
    expect(jobInputs).toEqual(jobFileInputsExpected);
});
