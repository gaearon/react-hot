'use strict';

/**
 * Returns a function that establishes the first prototype passed to it
 * as the "source of truth" and patches its methods on subsequent invocations,
 * also patching current and previous prototypes to forward calls to it.
 */
module.exports = function makeAssimilatePrototype(React) {
  var storedPrototype,
      knownPrototypes = [];

  function wrapMethod(key) {
    if (key === 'render') {
      return function render() {
        try {
          if (storedPrototype[key]) {
            return storedPrototype[key].apply(this, arguments);
          }
        } catch (err) {
          console.error(err);
          return React.createElement('div', {
            style: {
              width: '100%',
              height: '100%',
              backgroundColor: 'red',
              opacity: 0.6,
              fontSize: 18,
              color: 'white',
              textAlign: 'center',
              padding: 40,
              display: 'table'
            }
          }, React.createElement('span', {
            style: {
              display: 'table-cell',
              verticalAlign: 'middle'
            }
          }, err.toString()));
        }
      };
    }

    return function () {
      if (storedPrototype[key]) {
        return storedPrototype[key].apply(this, arguments);
      }
    };
  }

  function patchProperty(proto, key) {
    proto[key] = storedPrototype[key];

    if (typeof proto[key] !== 'function' ||
      key === 'type' ||
      key === 'constructor') {
      return;
    }

    proto[key] = wrapMethod(key);

    if (storedPrototype[key].isReactClassApproved) {
      proto[key].isReactClassApproved = storedPrototype[key].isReactClassApproved;
    }

    if (proto.__reactAutoBindMap && proto.__reactAutoBindMap[key]) {
      proto.__reactAutoBindMap[key] = proto[key];
    }
  }

  function updateStoredPrototype(freshPrototype) {
    storedPrototype = {};

    Object.getOwnPropertyNames(freshPrototype).forEach(function (key) {
      storedPrototype[key] = freshPrototype[key];
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