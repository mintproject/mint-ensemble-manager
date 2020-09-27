module.exports = {
    openapi: '3.0.0',
    info: {
      title: 'Ensemble Manager API',
      version: '3.0.0'
    },
    servers: [
      { url: 'http://localhost:3000/v1' },
      { url: 'https://ensemble.mint.isi.edu/v1' }
    ],
    components:{
      schemas: {
        ModelThread: {
          description: '',
          required:[
            'thread_id'
          ],
          type: 'object',
          properties: {
            thread_id: {
              description: 'The Modeling thread id',
              type: 'string'
            },
            model_id: {
              description: 'The Model id (optional. Set to null to run all)',
              type: 'string'
            }
          }
        },
        RepeatedThread: {
          description: '',
          required:[
            'thread_id',
            'every_minutes',
          ],
          type: 'object',
          properties: {
            thread_id: {
              description: 'The Modeling thread id',
              type: 'string'
            },
            every_minutes:{
              description: 'Repeat every minutes',
              type: 'number'
            },
            end_date: {
              description: 'End date when the repeat job should stop repeating.',
              type: 'string',
              format: "date-time"        
            }
          }
        }
      },
    },
    paths: {}
};