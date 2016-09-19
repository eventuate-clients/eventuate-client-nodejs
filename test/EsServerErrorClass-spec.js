import 'should';
import EsServerError from '../src/modules/EsServerError.js'


//TODO: get error from the ES Client
describe('EsServerError class', () => {
  it('should create instance', (done) => {

    const statusCode = 500;
    const body = {
      timestamp: 1474275366200,
      status: 500,
      error: 'Internal Server Error',
      exception: 'java.lang.IllegalArgumentException',
      message: 'org.springframework.web.util.NestedServletException: Request processing failed; nested exception is java.lang.IllegalArgumentException: should have 2 parts: List(qqqqqaaaaqqqaaaaqqaaa)',
      path: '/entity/net.chrisrichardson.eventstore.example.MyEntity/0000015741a8cc2b-0242ac1100460000'
    };

    const error = new EsServerError({
      error  : `Server returned status code ${statusCode}`,
      statusCode: 500,
      message: body
    });

    console.log(error);
    console.log(error.stack);

    done()
  });
});