"use strict";

var expect = chai.expect;
import * as focalStorage from './../src/external/focalStorage.js';
import * as $ from 'https://code.jquery.com/jquery-2.1.4.js';

describe('Github Fetch API', function() {
  it('get an 404 when fetching a non existing file with an xmlhttp get request from github', function(done) {
    $.get("https://github.lively4/repo/livelykernel/lively4-core/gh-pages/I_do_not_exist.txt", undefined,
      function(result) {
        done(new Error("We expected an error but got this as result: " + result))
      }).fail(function(err, status) {
        expect(err.status).to.be.equal(404)
        done()
      })
  });
});
