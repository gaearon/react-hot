'use strict';

/**
 * Returns a function that establishes the first prototype passed to it
 * as the "source of truth" and patches its methods on subsequent invocations,
 * also patching current and previous prototypes to forward calls to it.
 */
module.exports = function makeAssimilatePrototype() {
  var storedPrototype,
      knownPrototypes = [];

  function wrapMethod(key, descriptor, descKey) {
    if (typeof descriptor[descKey] === 'function') {
      descriptor[descKey] = function (firstArgument) {
        var storedDescriptor = Object.getOwnPropertyDescriptor(storedPrototype, key);
        if (storedDescriptor) {
          if (typeof storedDescriptor[descKey] === 'function') {
            return storedDescriptor[descKey].apply(this, arguments);
          } else if (descKey === 'get') {
            return this[key];
          } else if (descKey === 'set') {
            this[key] = firstArgument;
          }
        }
      };
    }
  }

  function patchProperty(proto, key) {
    var descriptor = Object.getOwnPropertyDescriptor(storedPrototype, key);

    if ((descriptor.get || descriptor.set || typeof descriptor.value === 'function') &&
      key !== 'type' &&
      key !== 'constructor') {

      wrapMethod(key, descriptor, 'get');
      wrapMethod(key, descriptor, 'set');
      wrapMethod(key, descriptor, 'value');

      if (proto.__reactAutoBindMap && proto.__reactAutoBindMap[key]) {
        proto.__reactAutoBindMap[key] = proto[key];
      }
    }

    Object.defineProperty(proto, key, descriptor);
  }

  function updateStoredPrototype(freshPrototype) {
    storedPrototype = {};

    Object.getOwnPropertyNames(freshPrototype).forEach(function (key) {
      Object.defineProperty(storedPrototype, key, Object.getOwnPropertyDescriptor(freshPrototype, key));
    });
  }

  function reconcileWithStoredPrototypes(freshPrototype) {
    knownPrototypes.push(freshPrototype);
    knownPrototypes.forEach(function (proto) {
      Object.getOwnPropertyNames(storedPrototype).forEach(function (key) {
        patchProperty(proto, key);
      });
    });
  }

  return function assimilatePrototype(freshPrototype) {
    if (Object.prototype.hasOwnProperty.call(freshPrototype, '__isAssimilatedByReactHotAPI')) {
      return;
    }

    updateStoredPrototype(freshPrototype);
    reconcileWithStoredPrototypes(freshPrototype);
    freshPrototype.__isAssimilatedByReactHotAPI = true;
  };
};