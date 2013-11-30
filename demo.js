TM.declare('doc.DataSource').extend({
  getPageData: function(page) {
    if (!(page && this._data)) {
      return;
    }
    
    return this._data[page];
  },
  
  initialize: function() {
    if (window.DOC_DATA_SOURCE) {
      this._data = DOC_DATA_SOURCE;
    }
  }
});

TM.declare('doc.CategoryItem').inherit('thinkmvc.Model').extend({
  viewPath: 'doc.CategoryItemView',
  
  getBlock: function() {
    return this._block;
  },
  
  getBlockTitle: function() {
    return this._block && this._block.title;
  },
  
  getBlockParts: function() {
    return this._block && this._block.parts;
  },
  
  hasBlocks: function() {
    return this._block && this._block.length ? true : false;
  },
  
  hasBlockParts: function() {
    return this._block && this._block.parts && this._block.parts.length ? true : false;
  },
  
  initialize: function(blockData) {
    this._block = blockData;
    this.superCall('initialize');
  }
});

TM.declare('doc.CategoryItemCollection').inherit('thinkmvc.Collection').extend({
  modelPath: 'doc.CategoryItem',
  
  initialize: function(pageData) {
    if (!pageData) {
      return;
    }
    this.superCall('initialize');
    
    for (var i = 0; pageData.blocks && i < pageData.blocks.length; i++) {
      this.add(pageData.blocks[i]);
    }
  }
});

TM.declare('doc.CategoryItemView').inherit('thinkmvc.View').extend({
  events: {
    'change': 'render'
  },
  
  rootNode: '#blockList',
  
  destroy: function() {
    this._viewHelper = null;
  },
  
  initialize: function(model) {
    this.superCall('initialize', model);
    this._viewHelper = this.U.getClass('doc.CategoryViewHelper');
    
    var viewId = this._viewId || (this._viewId = this.proto('viewId') || 1);
    this.proto('viewId', viewId + 1);
  },
  
  render: function(evt) {
    var viewId = this._viewId;
    var $section = this.$('#box-' + viewId);
    if (!$section.length) {
      $section = $('<section class="p-box"></section>');
      $section.attr('id', 'box-' + viewId);
      $section.append('<h2>' + this._model.getBlockTitle() + '</h2>');
      this.renderParts($section);
      this._$root.append($section);
    }

    var col = this._viewHelper.getMinCol($section.height());
    $section.css({
      left: col.left,
      width: col.width,
      top: col.top
    }).show();
  },
  
  renderParts: function($section) {
    if (!this._model.hasBlockParts()) {
      return;
    }
    
    var parts = this._model.getBlockParts();    
    var $subSection = $('<div class="p-sub-box"></div>');
    for (var i = 0; i < parts.length; i++) {
      $subSection.append('<h3>' + parts[i].title + '</h3>');
      this.renderItems($subSection, parts[i].items);
    }
    $section.append($subSection);
  },
  
  renderItems: function($subSection, items) {
    if (!(items && items.length)) {
      return;
    }
    
    var $items = $('<ul></ul>');
    for (var j = 0; j < items.length; j++) {
      var $li = $('<li></li>');
      if (items[j].url) {
        $li.append('<a href="' + items[j].url + '">' + items[j].text + '</a>');
      } else {
        $li.text(items[j].text);
      }
      $items.append($li);
    }
    $subSection.append($items);
  }
});

TM.declare('doc.GatewayController').inherit('thinkmvc.Controller').extend({
  events: {
    'resize window': 'renderPage'
  },
  
  rootNode: 'div.p-container',
  
  selectors: {
    'blockList': '#blockList',
    'title': 'div.p-page-title'
  },
  
  initialize: function() {
    this.superCall('initialize');
    this.initPageData();
    
    if (this._pageData) {
      this._el.$title.text(this._pageData.title);
    }
    this._el.$blockList.empty();
    
    this.renderPage();
  },
  
  initPageData: function() {
    var page = $('body').data('page');
    var pageData = this.U.createInstance('doc.DataSource').getPageData(page);
    if (!pageData) {
      return;
    }
    
    this._pageData = pageData;
    this._collections = this.U.createInstance('doc.CategoryItemCollection', pageData);
  },
  
  renderPage: function() {
    if (!this._collections) {
      return;
    }

    var viewHelper = this.U.getClass('doc.CategoryViewHelper');
    viewHelper.reset(this._el.$blockList.width());
    
    this._collections.change();
    this._el.$blockList.height(viewHelper.getMaxColHeight());
  }
});

TM.declare('doc.CategoryViewHelper').share({
  COL_NUM: 5,
  MARGIN: 40,
  MIN_WIDTH: 200,
  
  computeBoxWidth: function() {
    if (!this._containerWidth) {
      throw new Error('Container width is invalid.');
    }
    if (this._colsNum <= 1 || this._containerWidth < this.MIN_WIDTH) {
      return this._containerWidth - this.MARGIN / 2;
    }
    
    var boxWidth = (this._containerWidth + this.MARGIN / 2) / this._colsNum - this.MARGIN;
    if (boxWidth >= this.MIN_WIDTH) {
      return boxWidth;
    }
    
    this._colsNum--;
    return this.computeBoxWidth();
  },
  
  getBoxWidth: function() {
    if (!this._boxWidth) {
      this._boxWidth = this.computeBoxWidth();
    }
    return this._boxWidth;
  },
  
  getMaxColHeight: function() {
    var max = 0;
    for (var i = 0; i < this._boxColList.length; i++) {
      if (max < this._boxColList[i].height) {
        max = this._boxColList[i].height;
      }
    }
    
    return max + this.MARGIN;
  },
  
  getMinCol: function(height) {
    var min = 0;
    for (var i = 0; i < this._colsNum; i++) {
      if (this._boxColList[i] === undefined) {
        min = i;
        break;
      } else if (this._boxColList[min].height > this._boxColList[i].height) {
        min = i;
      }
    }
    
    var boxWidth = this.getBoxWidth();
    if (!this._boxColList[min]) {
      this._boxColList[min] = {
        height: height,
        index: min,
        left: min * (boxWidth + this.MARGIN),
        width: boxWidth,
        top: 0
      };
    } else {
      this._boxColList[min].top = this._boxColList[min].height + this.MARGIN;
      this._boxColList[min].height += height + this.MARGIN;
    }

    return this._boxColList[min];
  },
  
  reset: function(containerWidth) {
    this._containerWidth = containerWidth;
    this._boxColList = [];
    this._boxWidth = 0;
    this._colsNum = this.COL_NUM;
  }
});