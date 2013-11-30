(function() { // resolve compatibility problems
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function indexOf(element) {
      if (typeof elment === 'undefined') {
        return -1;
      }
      for (var i = 0; i < this.length; i++) {
        if (this[i] === element) {
          return i;
        }
      }
      return -1;
    };
  }

  if (!Array.prototype.forEach) {
    Array.prototype.forEach = function forEach(callback) {
      for (var i = 0; i < this.length; i++) {
        if (callback(this[i]) === false) {
          return;
        }
      }
    };
  }
}());

window.TM = (function() {
  var DEBUG_MODE = true, _pDocument = typeof document !== 'undefined' ? document : null, _pCom = {},
    _pNamespaces = {}, _pfSlice = Array.prototype.slice, _pConfig,
    _excludedAttributes = ['_extend', '_self', 'constructor', 'U'];
  
  // private multiple objects to targetObj
  function _pfCopy(targetObj) {
    var type = typeof targetObj;
    if (type !== 'object' && type !== 'function') {
      throw new Error('Passed a ' + type + ', please pass an object or function which copies.');
    }
    
    var sources = _pfSlice.call(arguments, 1);
    if (!sources || !sources.length) {
      return targetObj;
    }
    
    for (var i = 0; i < sources.length; i++) {
      var sourceObj = sources[i], srcType = typeof sourceObj;
      if (srcType !== 'object' && srcType !== 'function') {
        throw new Error('Please pass objects to copy.');
      }
      
      for (var key in sourceObj) {
        if (_excludedAttributes.indexOf(key) > -1) {
          continue;
        }
        
        if (sourceObj.hasOwnProperty(key)) {
          targetObj[key] = sourceObj[key];
        }
      }
    }
    
    return targetObj;
  }

  function _pfSplitClassPath(classPath) {
    var index = classPath.lastIndexOf('.');
    return index === -1
      ? ['com', classPath]
      : [ classPath.substring(0, index), classPath.substring(index + 1)];
  }
  
  function _pfOutput(msg) {
    console.log(msg);
  }
  
  // private object: _pGlobalUtil
  var _pGlobalUtil = (function(){
    var pageController;
    
    return {
      copy: _pfCopy,
      
      createEntrance: function() {
        if (pageController) {
          return;
        }
        
        var page = document.body.getAttribute('data-page');
        if (!page) {
          return;
        }
        
        var controller = _pConfig.pages && _pConfig.pages[page] && _pConfig.pages[page].controller;
        if (controller && this.hasClass(controller)) {
          pageController = this.createInstance(controller);
        } else {
          throw new Error('Controller class ' + controller + ' was not found for page ' + page);
        }
      },
      
      createInstance: function(classPath) {
        var klass = this.getClass(classPath);
        return klass.createInstance.apply(klass, _pfSlice.call(arguments, 1));
      },

      hasClass: function(classPath) {
        if (!classPath) {
          return false;
        }
        var paths = _pfSplitClassPath(classPath);
        var space = _pClassRegister.getNamespace(paths[0]);
        return space && space.hasClass(paths[1]);
      },
      
      getClass: function(classPath) {
        var paths = _pfSplitClassPath(classPath);
        var space = _pClassRegister.getNamespace(paths[0]);
        if (!space) {
          throw new Error('Failed to load class from ' + classPath);
        }
        return space.getClass(paths[1]);
      },
      
      printClasses: function() {
        for (var k in _pNamespaces) {
          _pNamespaces[k].printClasses();
        }
      },
      
      printNamespaces: function() {
        var names = [];
        for (var k in _pNamespaces) {
          names.push(k);
        }
        _pfOutput('All namespaces: ' + names.join(', '));
      },
      
      resetEntrance: function() {
        pageController = null;
        this.createEntrance();
      }
    };
  })(); // _pGlobalUtil

  // ClassRegister
  var _pClassRegister = (function(){
    // private class: LazyKlass
    var LazyKlass = function LazyKlass(name) {
      var className = name, extendedObj, parentClassPath, realClass, sharedObj, srcFunc;
      
      _pfCopy(this, {
        construct: function(func) {
          if (!func || typeof func !== 'function') {
            throw new Error('Passed arg should be a function.');
          }
          srcFunc = func;
          return this;
        },
        
        extend: function(obj) {
          extendedObj = obj;
          return this;
        },
        
        getParams: function() {
          if (!srcFunc) {
            srcFunc = function() {};
          }
          
          return {
            className: className,
            parentPath: parentClassPath || 'thinkmvc.Base',
            extendedObj: extendedObj,
            sharedObj: sharedObj,
            srcFunc: srcFunc
          };
        },
        
        inherit: function(classPath) {
          parentClassPath = classPath;
          return this;
        },
        
        share: function(obj) {
          sharedObj = obj;
          return this;
        }
      });
    } // LazyKlass
    
    // private class: Klass
    var Klass = function Klass(params, space) {
      var className = params.className, srcFunc = params.srcFunc;
      
      var freshClass = (function() {
        if (!className) {
          throw new Error('Class name is invalid.');
        }
        
        var classes = space.classes;
        if (!(classes[className] instanceof LazyKlass)) {
          throw new Error('The class ' + className + ' was not declared.');
        }
        
        var klass = createClass(srcFunc);                
        // static properties
        if (params.sharedObj) {
          _pfCopy(klass, params.sharedObj);
        }

        return classes[className] = klass;
      }());
      
      function createClass(srcFunc) {
        if (!srcFunc) {
          srcFunc = function() {};
        } else if (typeof srcFunc !== 'function') {
          throw new Error('Passed arg should be a function.');
        }
        
        var klass = function() {
          if ((typeof window !== 'undefined' && this === window)
              || (typeof global !== 'undefined' && this === global)) {
            throw new Error('Please use new operator to create an object!');
          }

          srcFunc.apply(this, arguments);
          
          if (typeof this.initialize !== 'undefined' && this.constructor.className === className) {
            this.initialize.apply(this, arguments);
          }
        };
        
        klass.prototype = srcFunc.prototype;
        klass.prototype._extend = function(obj) { _pfCopy(this, obj); }; // copy properties to the instance.
        klass.prototype.constructor = klass;
        klass.prototype.constructor.className = className;
        klass.prototype.U = _pGlobalUtil; // pass globalUtil to instances
        klass.prototype.getClassPath = function() { return space.name + '.' + className; };
        klass.prototype.parentClass = Object;
        return klass;
      }
      
      _pfCopy(this, {
        // public properties. all instances share one copy of each property
        extend: function(obj) {
          if (!obj) {
            return this;
          }
          
          if (typeof obj !== 'object') {
            throw new Error('Passed arg should be an object');
          }

          _pfCopy(freshClass.prototype, obj);
          return this;
        },
        
        getClass: function() {
          return freshClass;
        },
        
        inherit: function(classPath) {
          if (!classPath) {
            return this;
          }
          
          if (typeof classPath !== 'string') {
            throw new Error('Passed arg should be a string.');
          }
          
          var parentClass = _pGlobalUtil.getClass(classPath);
          if (typeof parentClass !== 'function') {
            throw new Error('Parent class is invalid');
          }
          
          var ref = freshClass;
          var className = ref.className;
          var emptyFunc = function() {};
          emptyFunc.prototype = parentClass.prototype;
          
          var CFunc = function() {
            parentClass.apply(this, arguments); // this has parent's properties
            this._super = _pfCopy(new emptyFunc(), this); // merge parent's own properties and prototype properties
            ref.apply(this, arguments); // append customer defined properties
          };

          CFunc.prototype = _pfCopy(new emptyFunc(), ref.prototype);
          CFunc.prototype.constructor = CFunc;
          CFunc.prototype.constructor.className = className;
          CFunc.prototype.parentClass = parentClass;
          
          // inherit Constructor properties
          _pfCopy(CFunc, parentClass);
          _pfCopy(CFunc, ref);

          space.classes[className] = freshClass = CFunc;
          return this;
        }
      });
    }; // Klass

    // private class: Namespace
    var Namespace = function Namespace(path) {
      var space = (function(s) {
        var name = s.toLowerCase().replace(/^com\.?|%S*/, '');
        if (/class|classes/.test(name)) {
          throw new Error("'class' is a reserved word in namespace!");
        }

        var parent = _pCom;
        if (name !== '') {
          var dirs = name.split('.');
          for (var i = 0; i < dirs.length; i++) {
            var dir = dirs[i];
            parent = parent[dir] || (parent[dir] = {});
          }
        }

        return {
          classes: parent.classes || (parent.classes = {}),
          dir: parent,
          name: (name ? 'com.' : 'com') + name
        };
      })(path); // space
      
      function createClass(lazyObj) {
        if (!lazyObj) {
          throw new Error('Passed arg is invalid.');
        }
        
        var params = lazyObj.getParams();
        var realClass = (new Klass(params, space)).extend(params.extendedObj).inherit(params.parentPath).getClass();        
        if (DEBUG_MODE) {
          _pfOutput('A new class ' + space.name + '.' + realClass.className + ' was created.');
        }
        return realClass;
      }

      _pfCopy(this, {
        getClass: function(className) {
          var klass = space.classes[className];
          if (!klass) {
            throw new Error('The class ' + this.getName() + '.' + className + ' does not exist.');
          }
          
          if (klass instanceof LazyKlass) {
            return createClass(klass);
          }
          return klass;
        },
        
        getName: function() {
          return space.name;
        },

        hasClass: function(className) {
          return className && className in space.classes;
        },
        
        printClasses: function() {
          var classNames = [];
          for (var k in space.classes) {
            classNames.push(k);
          }
          _pfOutput('[Namespace]: ' + space.name + '; [Classes]: ' + classNames.join(', '));
        },
        
        register: function(className) {
          var classes = space.classes;
          if (classes[className]) {
            throw new Error('The class ' + className + ' alredy exists.');
          }

          return classes[className] = new LazyKlass(className);
        }
      });
    }; // Namespace
    
    function getNamespace(path) {
      if (path !== 'com' && !/^com\./.test(path)) {
        path = 'com.' + path;
      }
      if (_pNamespaces[path]) {
        return _pNamespaces[path];
      }
      
      var space = new Namespace(path);
      return _pNamespaces[space.getName()] = space;
    }
  
    return {
      /*
        register a class delaration.
        param can be a string e.g. 'com.animal.Dog' or 'Dog' or 'animal.Dog'
      */
      declare: function(classPath) {
        if (typeof classPath !== 'string') {
          throw new Error('Passed args should be a string. E.g. the string can be com.animal.Dog or Dog or animal.Dog');
        }
        
        var paths = _pfSplitClassPath(classPath);
        var space = getNamespace(paths[0]);
        return space.register(paths[1]);
      },
      
      getNamespace: getNamespace
    };
  }()); // _pClassRegister
  
  // _pResourceLoader
  /* load javascript resources (a)schoronously */
  var _pResourceLoader = (function() {
    var dependencyStatusList = {}, scriptParent, scripts, sortedModules = [],
      status = { COMPLETED: 1, HAS_DEPENDENCIES: 2, PENDING: 3, READY: 4 };

    function allResourcesLoaded() {
      for (var k in dependencyStatusList) {
        if (dependencyStatusList[k] !== status.COMPLETED) {
          return false;
        }
      }
      return true;
    }
    
    function createScript(src, module) {
      if (!src) {
        return;
      }
      if (_pConfig && _pConfig.baseUrl && src.indexOf('http') < 0) {
        src = _pConfig.baseUrl + '/' + src;
      }
      
      var script = document.createElement('script');
      script.setAttribute('id', module);
      script.setAttribute('src', src);
      script.setAttribute('type', 'text/javascript');
      if (!(_pConfig && _pConfig.forceSync)) {
        script.setAttribute('async', true);
        script.setAttribute('defer', true);
      }
      
      if (script.addEventListener) {
        script.addEventListener('load', handleLoadEvent);
      } else {
        script.attachEvent('onreadystatechange', handleLoadEvent);
      }
      return script;
    }
    
    function getReadyResources() {
      var readyResources = [];
      if (_pConfig.forceSync) {
        for (var i = 0; i < sortedModules.length; i++) {
          var module = sortedModules[i];
          if (dependencyStatusList[module] === status.READY) {
            readyResources.push(module);
            setModuleStatus(module, status.PENDING);
          }
        }
      } else {
        for (var k in dependencyStatusList) {
          if (dependencyStatusList[k] === status.READY) {
            readyResources.push(k);
            setModuleStatus(k, status.PENDING);
          }
        }
      }
      
      return readyResources;
    }
    
    function getScript(id) {
      if (!id) {
        return;
      }
      
      var scripts = getScripts();
      for (var i = 0; scripts && i < scripts.length; i++) {
        if (id === scripts[i].getAttribute('id')) {
          return scripts[i];
        }
      }
    }
    
    function getScripts() {
      if (!scripts) {
        scripts = document.getElementsByTagName('script');
      }
      return scripts;
    }
    
    function handleLoadEvent(evt) {
      var target = evt.currentTarget || evt.srcElement;
      var module = target.getAttribute('id');
      if (!module) {
        return;
      }
      if (DEBUG_MODE) {
        _pfOutput('Downloading module ' + module + ' was completed.');
      }
      
      if (dependencyStatusList.hasOwnProperty(module)) {
        // the resource is downloaded, set the status to COMPLETED
        setModuleStatus(module, status.COMPLETED);
      }
      
      if (!_pConfig.forceSync) {    
        updateDependencyStatusList();
      }
      
      if (allResourcesLoaded()) {
        _pGlobalUtil.createEntrance();
      } else {
        loadResources();
      }
    }
    
    function loadResources() {
      var readyResources = getReadyResources();      
      if (!(readyResources && readyResources.length)) {
        return;
      }

      var fragment = document.createDocumentFragment();
      for (var i = 0; i < readyResources.length; i++) {
        var k = readyResources[i];
        var script = createScript(_pConfig.modules[k], k);
        if (!script) {
          throw new Error('The path of loading the resource is incorrect! resource:' + k);
        }
        setModuleStatus(k, status.PENDING);
        
        if (DEBUG_MODE) {
          _pfOutput('Going to to load resource: ' + k);
        }
        scriptParent.appendChild(script);
      }
      scriptParent.appendChild(fragment);
    }
    
    function setDependencyStatus(module) {
      if (!module) {
        return;
      }
      if(dependencyStatusList.hasOwnProperty(module)) {
        setModuleStatus(module);
        return;
      }
      if (getScript(module)) {
        setModuleStatus(module, status.COMPLETED);
        return;
      }
      
      var dependentModules = _pConfig.dependencies && _pConfig.dependencies[module];
      if (dependentModules && dependentModules.length) {
        var state = _pConfig.forceSync ? status.READY : status.HAS_DEPENDENCIES;
        setModuleStatus(module, state);
        
        for (var i = 0; i < dependentModules.length; i++) {
          setDependencyStatus(dependentModules[i]);
        }
      } else {
        setModuleStatus(module, status.READY);
      }
    }
    
    /* set module status and push module to list ready to be downloaded. */
    function setModuleStatus(module, state) {
      if (!module) {
        throw new Error('Module is not passed.');
      }
      if (typeof state !== 'undefined') {
        dependencyStatusList[module] = state;
      }
      
      state = dependencyStatusList[module];      
      if (_pConfig.forceSync && state === status.READY) {
        sortedModules.unshift(module);
      }
    }
    
    function updateDependencyStatusList() {
      // check status of other resources
      for (var k in dependencyStatusList) {
        if (dependencyStatusList[k] !== status.HAS_DEPENDENCIES) {
          continue;
        }
        
        // if k has dependencies, then check status of the resources which k depends on
        var isDone = true;
        _pConfig.dependencies[k].forEach(function(dk) {
          if (dependencyStatusList[dk] !== status.COMPLETED) {
            return isDone = false;
          }
        });
        
        if (isDone) {
          // the resources which k depends on are all downloaded, then set its status to READY.
          dependencyStatusList[k] = status.READY;
        }
      }
    }
    
    return {
      configure: function(config) {
        if (!(config && config.pages && config.modules)) {
          throw new Error('Configuration is invalid.');
        }
        
        _pConfig = config;
        
        var page = document.body.getAttribute('data-page');
        var module = _pConfig.pages[page] && _pConfig.pages[page].module;
        if (!module) {
          throw new Error('JS module was not found for page ' + page);
        }
        setDependencyStatus(module);
      },
      
      restart: function() {
        scripts = null;
        dependencyStatusList = [];
        scriptParent = null;
        this.start();
      },
      
      start: function() {
        var scriptList = getScripts();
        for (var i = 0; i < scriptList.length; i++) {
          var script = scriptList[i];
          if (!scriptParent) {
            scriptParent = script.parentNode;
          }
          
          var configUrl = script.getAttribute('data-config');
          if (!configUrl) {
            continue;
          }
          
          var script = getScript('config');
          if (script) {
            //script.onload();
          } else {
            scriptParent.appendChild(createScript(configUrl, 'config'));
          }
          break;
        }
      }
    };
  }()); // _pResourceLoader
  
  // Engine starts
  (function() {
    setTimeout(function() {
      _pResourceLoader.start();
    }, 0);
  }());

  return {
    configure: function() {
      return _pResourceLoader.configure.apply(_pResourceLoader, arguments);
    },
    declare: function() {
      return _pClassRegister.declare.apply(_pClassRegister, arguments);
    }
  };
}()); // core thinkMVC

// super class: Base
TM.declare('thinkmvc.Base').extend({
  DEBUG_MODE: true,
  
  debug: function(msg) {
    console.log(msg);
  },
  
  destroy: function() {
    this.proxiedCallbacks = null;
  },
  
  isInstanceOf: function(klass) {
    if (typeof klass === 'string') {
      klass = this.U.getClass(klass);
    }
    if (this instanceof klass) {
      return true;
    }
    if (klass === Object || !this._super) {
      return false;
    }
    return this._super.isInstanceOf(klass);
  },
  
  // set current object as the context of performing callback
  proxy: function(callback, callbackName) {
    var name = callbackName || (function(func){
      if (typeof func !== 'function') {
        throw new Error('Passed arg is not a function.');
      }
      
      if (func.hasOwnProperty('name')) {
        return func.name;
      }
      // IE doesn't support the attribute 'name' of a function
      var reg = /function\s+(.+)\(/i;
      var result = reg.exec(func.toString());
      return result[1];
    })(callback);
    
    if (!name) {
      throw new Error('Callback name is not assigned.');
    }
    
    var callbacks = this._proxiedCallbacks || (this._proxiedCallbacks = {});
    if (!callbacks[name]) {
      var self = this;
      callbacks[name] = function() {
        return callback.apply(self, arguments);
      };
    }
    return callbacks[name];
  },
  
  // set/get an attribute to constructor's propotype
  proto: function(name, value) {
    if (!(name && typeof name === 'string')) {
      return;
    }
    
    var pr = this.constructor.prototype;
    if (arguments.length > 1) {
      pr[name] = value;
    }
    return pr[name];
  },
  
  toString: function() {
    var props = [], funcs = [];
    for (var k in this) {
      if (this[k] instanceof Function) {
        funcs.push(k);
      } else if (this[k] instanceof Object) {
        props.push(k + '(object)');
      } else {
        props.push(k + '=' + this[k]);
      }
    }
    
    return  '[Class]: ' + this.constructor.className
      + '; [Functions]: ' + funcs.join(', ')
      + '; [Properties]: ' + props.join(', ');
  },
  
  // call the parent's method in current context. it is different from this._super.func
  superCall: function(funcName) {
    var _super = this._super;
    if (!_super) {
      return;
    }
    
    if (funcName in _super && _super[funcName] instanceof Function) {
      _super[funcName].apply(this, Array.prototype.slice.call(arguments, 1));
    } else {
      throw new Error('Function ' + funcName + ' was not found.');
    }
  }
}).share({
  createInstance: function() {
    var TempFunc = function() {};
    TempFunc.prototype = this.prototype;

    var instance = new TempFunc;
    this.apply(instance, arguments);
    return instance;
  }
}); // Base

// class: Event
TM.declare('thinkmvc.evt.Event').extend({
  execute: function(target, data) {
    var callbackList = this._callbackList;
    if (!(callbackList && callbackList.length)) {
      return;
    }
    
    var args = { data: data, target: target };
    for (var i = 0; i < callbackList.length; i++) {
      callbackList[i](args);
    }
    
    if (this.DEBUG_MODE) {
      this.debug('Successfully triggered the event ' + this._name + ' on ' + target.getClassPath());
    }
  },
  
  getName: function() {
    return this._name;
  },
  
  initialize: function(name) {
    this._name = name;
  },
  
  push: function(callback_s) {
    var callbackList = this._callbackList || (this._callbackList = []);
    Array.prototype.push.apply(callbackList, arguments);
    return this;
  },
  
  remove: function(callback) {
    if (!callback) {
      this._callbackList = null;
      return this;
    }
    
    var index, callbackList = this._callbackList;
    while (index = callbackList.lastIndexOf(callback)) {
      callbackList.splice(index, 1);
    }
    return this;
  }
}); // Event

// class: EventManager
TM.declare('thinkmvc.evt.EventManager').extend({
    off: function(name, callback) {
      var events = this._events;
      if (!events) {
        return this;
      }
      
      if (!name) {
        this._events = null;
      } else if (name in events) {
        events[name].remove(callback);
      }
      return this;
    },
    
    on: function(name, callback) {
      var events = this._events || (this._events = {});
      if (!events[name]) {
        events[name] = this.U.createInstance('thinkmvc.evt.Event', name);
      }
      events[name].push(callback);
      return this;
    },
    
    trigger: function(name, data) {
      var events = this._events;
      if (events && (name in events)) {
        events[name].execute(this, data);
      }
      return this;
    }
}); // EventManager

// super model class
TM.declare('thinkmvc.Model').inherit('thinkmvc.evt.EventManager').extend({
  change: function() {
    return this.trigger('change');
  },
  
  destroy: function() {
    if (this._view) {
      this._view.destroy();
      this._view = null;
    }
    this.trigger('destory').off();
  },
  
  initialize: function() {
    if (this.viewPath) {
      this._view = this.U.createInstance(this.viewPath, this);
    }
  }
}); // Model

TM.declare('thinkmvc.Collection').inherit('thinkmvc.evt.EventManager').extend({
  add: function() {
    var Model = this._Model || (this._Model = this.U.getClass(this.modelPath));
    var instance = this._Model.createInstance.apply(Model, arguments);
    this._models.push(instance);
    
    return this.trigger('add', instance);
  },
  
  change: function(updateAll) {
    if (updateAll !== false) {
      this.each(function(model) {
        model.change();
      });
    }
    return this.trigger('change');
  },
  
  destroy: function() {
    this._models = null;
    this._view = null;
    this.trigger('destroy').off();
  },
  
  each: function(callback) {
    if (!callback || this.isEmpty()) {
      return;
    }
    
    for (var i = 0; i < this.size(); i++) {
      callback(this.get(i));
    }
  },
  
  get: function(index) {
    if (index >= 0 && index < this._models.length) {
      return this._models[index];
    }
  },
  
  initialize: function() {
    if (!this.modelPath) {
      throw new Error('Model path is not set.');
    }
    
    this._models = [];    
    if (this.viewPath) {
      this._view = this.U.createInstance(this.viewPath, this);
    }
  },
  
  isEmpty: function() {
    return this.size() > 0 ? false : true;
  },
  
  last: function() {
    var index = this.size() - 1;
    return index >= 0 ? this._models[index] : null;
  },
  
  remove: function(index) {
    if (typeof index === 'undefined') {
      this._models = [];
      this.trigger('remove:all');
    } else {
      var model = this.get(index);
      if (model) {
        this._models.splice(index, 1);
        model.destroy();
      }
      this.trigger('remove:one', model ? true : false);
    }
    return this.trigger('remove');
  },
  
  size: function() {
    return this._models.length;
  }
});

TM.declare('thinkmvc.ui.Common').extend({
  $: function(selector) {
    return this._$root.find(selector);
  },
  
  destory: function() {
    var el = this._el;
    if (!el) {
      return;
    }
    
    for (var k in el) {
      el[k] = null;
    }
    this._el = null;
  },
  
  refreshElements: function() {
    var $root = this._$root || (this._$root = $(this.rootNode || 'html')), selectors = this.selectors;    
    // elements
    if (!selectors) {
      return;
    }

    var el = this._el || (this._el = {});
    for (var k in selectors) {
      el['$' + k] = this.$(selectors[k]);
    }
  }
});

// super controller class
TM.declare('thinkmvc.Controller').inherit('thinkmvc.ui.Common').extend({
  actionsDeclared: false,  
  eventSplitter: /^(\S+)\s*(.*)$/,
  undelegatableEvents: [], // some events are not delegatable via jQuery
  
  // for AUI declarative
  declareActions: function() {
    if (this.actionsDeclared || !(this.actions && A && A.declarative)) {
      return;
    }
    
    var actions = this.actions, eventSplitter = this.eventSplitter;
    for (var key in actions) {
      var method = actions[key];
      if (typeof method !== 'string' || !(method in this)) {
        throw new Error('Failed to find method ' + method);
      }
      
      var match = key.match(eventSplitter); // 1: action name, 2: event name
      A.declarative(match[1], match[2], this.proxy(this[method], method));
    }
    
    this.proto('actionsDeclared', true);
  },
  
  initEvents: function() {
    var events = this.events;
    if (!events) {
      return;
    }
    
    var $root = this._$root, $doc = $(document), $win = $(window),
      eventSplitter = this.eventSplitter, undelegatableEvents = this.undelegatableEvents;
    for (var key in events) {
      var method = events[key];
      if (typeof method !== 'string' || !(method in this)) {
        throw new Error('Failed to find method ' + method);
      }
      
      var callback = this.proxy(this[method], method);
      var match = key.match(eventSplitter), evtName = match[1], selector = match[2];
      if (selector) {
        if (selector === 'document') {
          $doc.off(evtName, callback).on(evtName, callback);
        } else if (selector === 'window') {
          $win.off(evtName, callback).on(evtName, callback);
        } else if (undelegatableEvents.indexOf(evtName) > -1) {
          this._$(selector).off(evtName, callback).on(evtName, callback);
        } else {
          $root.off(evtName, selector, callback).on(evtName, selector, callback);
        }
      } else {
        $root.off(evtName, callback).on(evtName, callback);
      }
    }
  },
  
  initialize: function() {
    this.refreshElements();
    this.initEvents();
    this.declareActions();
  }
}); // Controller

// super view class
TM.declare('thinkmvc.View').inherit('thinkmvc.ui.Common').extend({
  destroy: function() {
    this.superCall('destroy');
    this._model = null;
  },
  
  initEvents: function() {
    var events = this.events;
    if (!(events && this._model)) {
      return;
    }
    
    for (var key in events) {
      var method = events[key];
      if (typeof method !== 'string' || !(method in this)) {
        throw new Error('Failed to find method ' + method);
      }

      var callback = this.proxy(this[method], method);
      this._model.off(key, callback).on(key, callback);
    }
  },
  
  initialize: function(model) {
    this._model = model;
    this.refreshElements();
    this.initEvents();
  }
});
