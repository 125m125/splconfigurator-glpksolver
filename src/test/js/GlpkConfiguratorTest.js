import test from 'ava';
import {Model} from 'splconfigurator';
import {
  loadModel,
  getConfigFromModel,
} from './util/serializationHelper';
import GlpkConfigurator from '../../main/js/GlpkConfigurator';

import complex1 from '../resources/complex1.json';
import complex1Positive from '../resources/complex1Positive.json';
import complex1Negative from '../resources/complex1Negative.json';
import trap from '../resources/trap.json';
import trapSolution from '../resources/trapSolution.json';
import impossible from '../resources/impossible.json';

test('GlpkConfigurator selects root positive with positive preference', (t) => {
  const model = new Model('core');
  const uut = new GlpkConfigurator(model, true);

  return uut.solve().then((result) => {
    t.true(result.success);
    t.is(model.selectionOf('core'), true, 'root should be selected positive');
  });
});

test('GlpkConfigurator selects root positive with negative preference', (t) => {
  const model = new Model('core');
  const uut = new GlpkConfigurator(model, false);

  return uut.solve().then((result) => {
    t.true(result.success);
    t.is(model.selectionOf('core'), true, 'root should be selected positive');
  });
});

test('GlpkConfigurator solves complex1 positive', (t) => {
  const model = loadModel(complex1);
  const uut = new GlpkConfigurator(model, true);

  return uut.solve().then((result) => {
    t.true(result.success);
    t.deepEqual(getConfigFromModel(model), complex1Positive, 'selections should be equivalent');
  });
});

test('GlpkConfigurator solves complex1 negative', (t) => {
  const model = loadModel(complex1);
  const uut = new GlpkConfigurator(model, false);

  return uut.solve().then((result) => {
    t.true(result.success);
    t.deepEqual(getConfigFromModel(model), complex1Negative, 'selections should be equivalent');
  });
});

test('GlpkConfigurator solves trap positive', (t) => {
  const model = loadModel(trap);
  const uut = new GlpkConfigurator(model, true);

  return uut.solve().then((result) => {
    t.true(result.success);
    t.deepEqual(getConfigFromModel(model), trapSolution, 'selections should be equivalent');
  });
});

test('GlpkConfigurator solves trap negative', (t) => {
  const model = loadModel(trap);
  const uut = new GlpkConfigurator(model, false);

  return uut.solve().then((result) => {
    t.true(result.success);
    t.deepEqual(getConfigFromModel(model), trapSolution, 'selections should be equivalent');
  });
});

test('GlpkConfigurator fails impossible positive', (t) => {
  const model = loadModel(impossible);
  const uut = new GlpkConfigurator(model, true);

  return uut.solve().then((result) => {
    t.false(result.success);
    t.is(model.selectionOf('impossible'), undefined, 'root should not be selected');
  });
});

test('GlpkConfigurator fails impossible negative', (t) => {
  const model = loadModel(impossible);
  const uut = new GlpkConfigurator(model, false);

  return uut.solve().then((result) => {
    t.false(result.success);
    t.is(model.selectionOf('impossible'), undefined, 'root should not be selected');
  });
});

test.skip('GlpkConfigurator respects featurelist', (t) => {
  const model = loadModel(complex1);
  const uut = new GlpkConfigurator(model, true);

  return uut.solve(['optional2']).then((result) => {
    t.true(result.success);
    t.deepEqual(getConfigFromModel(model), {
      core: true,
      exclusive1: undefined,
      exclusive2: undefined,
      exclusive3: undefined,
      nested1: undefined,
      nested2: undefined,
      nestedMandatory: true,
      mandatory1: true,
      mandatory2: true,
      mandatory3: true,
      optional1: undefined,
      optional2: true,
      optional3: false,
      or1: undefined,
      or2: undefined,
      or3: undefined,
    }, 'selections should be equivalent');
  });
});
