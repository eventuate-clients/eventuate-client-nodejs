'use strict';
const expect = require('chai').expect;
const escapeStr = require('../dist/modules/specialChars').escapeStr;
const unEscapeStr = require('../dist/modules/specialChars').unEscapeStr;


describe('Module specialChars', function () {
  it('should be have property function escapeStr()', () => {
    expect(escapeStr).to.be.a('Function');
  });

  it('should be have property function unEscapeStr()', () => {
    expect(unEscapeStr).to.be.a('Function');
  });

  it('should escapeStr all needed characters', () => {

    const source = '{"subscriberId":"12345","entityTypesAndEvents":\n\r{"\\net.chrisrichardson.eventstore.example.MyEntity":["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    const expected = '{"subscriberId"\\c"12345","entityTypesAndEvents"\\c\\n\\r{"\\\\net.chrisrichardson.eventstore.example.MyEntity"\\c["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    const result = escapeStr(source);
    expect(result).to.equal(expected);
  });

  it('should unEscapeStr all needed characters', () => {
    const source = '{"subscriberId"\\c"12345","entityTypesAndEvents"\\c\\n{"net.chrisrichardson.eventstore.example.MyEntity"\\c["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    const expected = '{"subscriberId":"12345","entityTypesAndEvents":\n{"net.chrisrichardson.eventstore.example.MyEntity":["net.chrisrichardson.eventstore.example.MyEntityWasCreated","net.chrisrichardson.eventstore.example.MyEntityNameChanged"]}}';

    const result = unEscapeStr(source);
    expect(result).to.equal(expected);
  });
});