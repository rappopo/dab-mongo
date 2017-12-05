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
      idSrc: '_id',
      idDest: '_id',
      url: 'mongodb://localhost:27017/test',
      collection: 'docs'
    })
  })

  it('should return options with custom idDest', function () {
    const cls = new Cls({ 
      idDest: 'uid'
    })
    expect(cls.options).to.include({
      idDest: 'uid'
    })
  })

  it('should return options with custom url', function () {
    const cls = new Cls({ 
      url: 'mongodb://localhost:27017/mydb',
    })
    expect(cls.options).to.include({
      url: 'mongodb://localhost:27017/mydb',
    })
  })

  it('should return options with custom collection', function () {
    const cls = new Cls({ 
      collection: 'mycoll'
    })
    expect(cls.options).to.include({
      collection: 'mycoll'
    })
  })

})


