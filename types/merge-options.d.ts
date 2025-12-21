declare module 'merge-options' {
  function mergeOptions<T extends object>(...objects: Partial<T>[]): T;
  export = mergeOptions;
}
