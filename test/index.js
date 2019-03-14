'use strict';

var should = require('chai').should();
var rtmcore = require('../');

describe('Library', function() {
  it('should export primatives', function() {
    should.exist(rtmcore.crypto);
    should.exist(rtmcore.encoding);
    should.exist(rtmcore.util);
    should.exist(rtmcore.errors);
    should.exist(rtmcore.Address);
    should.exist(rtmcore.Block);
    should.exist(rtmcore.MerkleBlock);
    should.exist(rtmcore.BlockHeader);
    should.exist(rtmcore.HDPrivateKey);
    should.exist(rtmcore.HDPublicKey);
    should.exist(rtmcore.Networks);
    should.exist(rtmcore.Opcode);
    should.exist(rtmcore.PrivateKey);
    should.exist(rtmcore.PublicKey);
    should.exist(rtmcore.Script);
    should.exist(rtmcore.Transaction);
    should.exist(rtmcore.URI);
    should.exist(rtmcore.Unit);
  });
});
