import promisedGlpk from 'glpk.js';
import {ExclusiveChildGroup, MandatoryChildGroup, OptionalChildGroup, OrChildGroup, RequireConstraint, ExcludeConstraint} from 'splconfigurator';

function solve(rootFeature, {preference, model, glpk, logLevel}) {
  const glpkModel =
        new GlpkModel(glpk, preference ? glpk.GLP_MAX : glpk.GLP_MIN);

  addFeature(rootFeature, glpkModel);

  let resultingLogLevel = glpk.GLP_MSG_OFF;
  if (typeof logLevel === 'number') {
    resultingLogLevel = logLevel;
  } else if (typeof logLevel === 'string') {
    if (typeof glpk[logLevel] !== 'undefined') {
      resultingLogLevel = glpk[logLevel];
    } else if (typeof glpk['GLP_MSG_' + logLevel] !== 'undefined') {
      resultingLogLevel = glpk['GLP_MSG_' + logLevel];
    }
  }

  if (resultingLogLevel === glpk.GLP_MSG_DBG) {
    console.log(JSON.stringify(glpkModel, null, 2));
  }
  const result = glpk.solve(glpkModel, resultingLogLevel);
  if (resultingLogLevel === glpk.GLP_MSG_DBG) {
    console.log(JSON.stringify(result, null, 2));
  }
  if (result.result &&
        (result.result.status === glpk.GLP_OPT ||
            result.result.status === glpk.GLP_FEAS)) {
    model.startSelection();
    Object.keys(result.result.vars).forEach((name) => {
      model.selectFeature(name, result.result.vars[name], 'Glpk decision');
    });
    result.success = true;
  } else {
    result.success = false;
  }
  return result;
}

function addFeature(feature, glpkModel, parentConstraints) {
  glpkModel.addBinaryVariable(feature.name, 1);

  if (parentConstraints) {
    parentConstraints.forEach((c) => c.addVariable(feature.name));
  } else {
    const masterConstraint = glpkModel.addConstraint('master', 1, 1);
    masterConstraint.addVariable(feature.name);
  }
  feature.children.forEach((cg) => {
    const childConstraints = [];
    if (cg instanceof ExclusiveChildGroup) {
      childConstraints.push(glpkModel.addConstraint(null, 0, 0));
      childConstraints[0].addVariable(feature.name, -1);
    } else if (cg instanceof MandatoryChildGroup) {
      childConstraints.push(glpkModel.addConstraint(null, 0, 0));
      childConstraints[0].addVariable(feature.name, -cg.features.length);
    } else if (cg instanceof OptionalChildGroup) {
      childConstraints.push(
          glpkModel.addConstraint(null, -Number.MAX_SAFE_INTEGER, 0));
      childConstraints[0].addVariable(feature.name, -cg.features.length);
    } else if (cg instanceof OrChildGroup) {
      childConstraints
          .push(glpkModel.addConstraint(null, -cg.features.length + 1, 0));
      childConstraints[0].addVariable(feature.name, -cg.features.length);
    } else {
      throw new Error('unknown child group');
    }
    cg.features.forEach((f) => addFeature(f, glpkModel, childConstraints));
  });
  feature.crossTreeConstraints.forEach((c) => {
    if (c.features[0] === feature) {
      if (c instanceof RequireConstraint) {
        const constraint =
                    glpkModel.addConstraint(null, 0, Number.MAX_SAFE_INTEGER);
        constraint.addVariable(feature.name, -c.features.length + 1);
        for (let i = 1; i < c.features.length; i++) {
          constraint.addVariable(c.features[i].name);
        }
      } else if (c instanceof ExcludeConstraint) {
        const constraint = glpkModel.addConstraint(null, 0, 1);
        c.features.forEach((f) => constraint.addVariable(f.name));
      }
    }
  });
}

export default function GlpkConfigurator(model, preference, logLevel) {
  this.solve = () =>
    promisedGlpk.then(
        (glpk) =>
          model.serializeModel(solve, {preference, model, glpk, logLevel})
    );
}

function GlpkModel(glpk, optimizationType) {
  this.name = 'LP';
  this.objective = {
    direction: optimizationType,
    name: 'obj',
    vars: [],
  };
  this.binaries = [];
  this.subjectTo = [];
  let constraintCounter = 0;

  this.addBinaryVariable = (name, weight) => {
    if (weight) {
      this.objective.vars.push({name, coef: weight});
    }
    this.binaries.push(name);
  };

  this.addConstraint = (name, lowerBound, upperBound, weightedVariables) => {
    if (name instanceof GlpkConstraint) {
      this.subjectTo.push(name);
      return name;
    }
    const constraint =
            new GlpkConstraint(name, lowerBound, upperBound, weightedVariables);
    this.subjectTo.push(constraint);
    return constraint;
  };

  function GlpkConstraint(name, lowerBound, upperBound, weightedVariables) {
    let boundType;
    if (lowerBound == upperBound) {
      boundType = glpk.GLP_FX;
    } else {
      boundType = glpk.GLP_DB;
    }
    this.name = name || 'constr' + constraintCounter++;
    this.bnds = {type: boundType, ub: upperBound, lb: lowerBound};
    this.vars = weightedVariables || [];

    this.addVariable = (name, coef) => {
      this.vars.push({name, coef: coef || 1});
    };
  }
}

