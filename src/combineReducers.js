import _ from './utils';

import Immutable from 'immutable';

let isActionMap,
    isDomainMap,
    iterator;

isINIT = (type) => {
  return type.startsWith('@@') && type.endsWith('INIT');
}

/**
 * @param {Object.<string, Object>} map
 * @return {boolean} If every object property value is a plain object.
 */
isDomainMap = (map) => {
    return _.every(map, _.isPlainObject);
};

/**
 * @param {Object.<string, Function>} map
 * @return {boolean} If every object property value is a function.
 */
isActionMap = (map) => {
    return _.every(map, _.isFunction);
};

/**
 * @param {Object} domain
 * @param {Object} action
 * @param {String} action.type
 * @param {Object} collection
 * @param {Object} tapper
 * @return {Object}
 */
iterator = (domain, action, collection, tapper) => {
    let newDomain;
    let type = isINIT(action.type) ? 'CONSTRUCT' : action.type;

    if (!Immutable.Iterable.isIterable(domain)) {
        throw new Error('Domain must be an instance of Immutable.Iterable.');
    }

    newDomain = domain;

    // console.log('domain', domain, 'action', action, 'definition', collection);

    _.forEach(collection, (value, domainName) => {
        // console.log('value', value, 'domain', domainName, 'isActionMap', isActionMap(value), 'isDomainMap', isDomainMap(value));

        if (isActionMap(value)) {
            // console.log('action.name', action.name, 'value[action.name]', typeof value[action.name]);

            if (value[type]) {
                let result;

                tapper.isActionHandled = true;

                result = value[type](newDomain.get(domainName), action);

                if (!Immutable.Iterable.isIterable(result)) {
                    throw new Error(`Reducer must return an instance of Immutable.Iterable. "${domainName}" domain "${action.type}" action handler result is "${typeof result}".`);
                }

                newDomain = newDomain.set(domainName, result);
            }
        } else if (isDomainMap(value)) {
            newDomain = newDomain.set(domainName, iterator(newDomain.get(domainName) || Immutable.Map(), action, value, tapper));
        }
    });

    return newDomain;
};

/**
 * @param {Object} reducer
 * @return {Function}
 */
export default (reducer) => {
    /**
     * @param {Immutable.Iterable} state
     * @param {Object} action
     * @return {Immutable.Iterable}
     */
    return (state, action) => {
        let newState,
            tapper;

        if (!action) {
            throw new Error('Action parameter value must be an object.');
        }

        // Tapper is an object that tracks execution of the action.
        // @todo Make this an opt-in.
        tapper = {
            isActionHandled: false
        };

        newState = iterator(state, action, reducer, tapper);

        if (!tapper.isActionHandled && isINIT(action.type)) {
            console.warn(`Unhandled action "${action.type}".`, action);
        }

        return newState;
    };
};
