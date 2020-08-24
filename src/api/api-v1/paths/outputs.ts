export default function(outputsService: any) {
    let operations = {
      POST
    };
   
    function POST(req: any, res: any, next: any) {
        outputsService.compress(req.body).then((result: any) => {
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
      summary: 'Search the ensembles and compress them in a zip file',
      operationId: 'compressFiles',
      requestBody: {
        description: 'Search the ensembles and compress them in a zip file',
        required: true,
        content: {
          'application/json': {
            schema: {
                $ref: '#/components/schemas/EnsembleDownloadRequest'
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
  
    return operations;
  }