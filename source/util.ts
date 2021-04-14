import _glob from "glob";

const promiseSettledStatuses = ["rejected", "fulfilled"] as const;
type PromiseSettledStatus = typeof promiseSettledStatuses[number];

export function splitPromiseSettledResults<T>(r: PromiseSettledResult<T>[]) {
  const hasStatus = (status: PromiseSettledStatus) => {
    return (r: PromiseSettledResult<T>) => r.status === status;
  };

  return {
    rejected: r.filter(hasStatus("rejected")) as PromiseRejectedResult[],
    fulfilled: r.filter(hasStatus("fulfilled")) as PromiseFulfilledResult<T>[],
  };
}

// Wraps the glob lib in a Promise
export async function glob(pattern: string, options: _glob.IOptions = {}) {
  return new Promise<string[]>((resolve, reject) => {
    _glob(pattern, options, (err, matches) => {
      if (err) {
        reject(err);
      }
      resolve(matches);
    });
  });
}

export function hasProperties<T extends object>(input: object, properties: (keyof T)[]) {
  const propertySet = new Set(properties);
  const obj = input as T
  let hasAllProperties = true
  propertySet.forEach(propertyName => {
    hasAllProperties = hasAllProperties && Boolean(obj[propertyName])
  })
  return hasAllProperties
}
