import {JSONSerializer} from 'splconfigurator';

export function loadModel(json) {
  return new JSONSerializer().deserializeModel(json);
}

export function getConfigFromModel(model) {
  return model.serializeConfiguration(new JSONSerializer());
}
