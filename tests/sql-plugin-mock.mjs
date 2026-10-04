let loadImplementation;

export function mockLoad(implementation) {
  loadImplementation = implementation;
}

export default class Database {
  static load(path) {
    return loadImplementation(path);
  }
}
