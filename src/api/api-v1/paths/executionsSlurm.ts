// ./api/api-v1/paths/executionsSlurm.ts
                                                                                                                                                                                                                                      
export default function(executionsSlurmService: any) {
    let operations = {
      POST,
      DELETE,
      EMPTY
    };
   
    function POST(req: any, res: any, next: any) {
        executionsSlurmService.submitExecution(req.body).then((result: any) => {
          if(result.result == "error") {
            res.status(406).json(result);
          }
          else {
            res.status(202).json(result);
          }
        });
    }

    function DELETE(req: any, res: any, next: any) {
      executionsSlurmService.deleteExecutionCache(req.body).then((result: any) => {
        if(result.result == "error") {
          res.status(406).json(result);
        }
        else {
          res.status(202).json(result);
        }
      });
    }
    
    function EMPTY(req:any, res: any, next: any) {
      executionsSlurmService.emptyExecutionQueue().then((result: any) => {
        if(result.result == "error") {
          res.status(406).json(result);
        }
        else {
          res.status(202).json(result);
        }
      });
    }
   
    // NOTE: We could also use a YAML string here.
    POST.apiDoc = {
      summary: 'Submit modeling thread for slurm execution.',
      operationId: 'submitSlurmExecution',
      requestBody: {
        description: 'Modeling thread',
        required: true,
        content: {
          'application/json': {
            schema: {
                $ref: '#/components/schemas/ModelThread'
            }
          }
        }
      },
      responses: {
          "202": {
              description: "Successful response"
          },
          default: {
            description: 'An error occurred'
          }
      }
    };


  
    // NOTE: We could also use a YAML string here.
    DELETE.apiDoc = {
      summary: 'Delete cached results, cached models and cached data for slurm execution.',
      operationId: 'deleteSlurmExecutionCache',
      requestBody: {
        description: 'Modeling thread',
        required: true,
        content: {
          'application/json': {
            schema: {
                $ref: '#/components/schemas/ModelThread'
            }
          }
        }
      },
      responses: {
          "202": {
              description: "Successful response"
          },
          default: {
            description: 'An error occurred'
          }
      }
    };

    // NOTE: We could also use a YAML string here.
    EMPTY.apiDoc = {
      summary: 'Empty Slurm Execution Queue.',
      operationId: 'emptyExecutionQueue',
      responses: {
          "202": {
              description: "Successful response"
          },
          default: {
            description: 'An error occurred'
          }
      }
    };
   
    return operations;
  }