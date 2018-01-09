'use strict'

const chai = require('chai'),
  expect = chai.expect,
  chaiSubset = require('chai-subset')

chai.use(chaiSubset)

const Cls = require('../index'),
  lib = require('./_lib')

describe('setOptions', function () {
  it('should return the default options', function () {
    const cls = new Cls()
    expect(cls.options).to.include({
      url: 'mongodb://localhost:27017'
    })
  })

  it('should return options with custom url', function () {
    const cls = new Cls({ 
      url: 'mongodb://mydburl:27017',
    })
    expect(cls.options).to.include({
      url: 'mongodb://mydburl:27017',
    })
  })

})


