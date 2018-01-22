/**
 * 
 */
(function(g) {
	g.wol =  g.wol||{};
	g.wol.control = g.wol.control|| {};


	g.wol.control.RotateNorth= function(opt_options) {

		var options = opt_options || {};

		var button = document.createElement('button');
		button.innerHTML = 'N';

		var this_ = this;
		var handleRotateNorth = function(e) {
			this_.getMap().getView().setRotation(0);
		};

		button.addEventListener('click', handleRotateNorth, false);
		button.addEventListener('touchstart', handleRotateNorth, false);

		var element = document.createElement('div');
		element.className = 'rotate-north ol-unselectable ol-control';
		element.appendChild(button);

		ol.control.Control.call(this, {
			element: element,
			target: options.target
		});

	};
	ol.inherits(wol.control.RotateNorth, ol.control.Control);



	/**
	 * OpenLayers 3 Map Legend.
	 * See [the examples](./examples) for usage.
	 * @constructor
	 * @extends {ol.control.Control}
	 * @param {Object} opt_options Control options, extends olx.control.ControlOptions adding:
	 *                              **`tipLabel`** `String` - the button tooltip.
	 */
	wol.control.Legend = function(opt_options) {

		var options = opt_options || {};

		this.html = options["html"];

		var tipLabel = options.tipLabel ?	options.tipLabel : 'Legend';

		this.mapListeners = [];

		this.hiddenClassName = 'ol-unselectable ol-control layer-switcher';
		if (wol.control.Legend.isTouchDevice_()) {
			this.hiddenClassName += ' touch';
		}
		this.shownClassName = this.hiddenClassName + ' shown';

		var element = document.createElement('div');
		element.className = this.hiddenClassName;

		var button = document.createElement('button');
		button.setAttribute('title', tipLabel);
		element.appendChild(button);

		this.panel = document.createElement('div');
		this.panel.className = 'panel';
		element.appendChild(this.panel);
		wol.control.Legend.enableTouchScroll_(this.panel);

		var me = this;

		button.onclick = function(e) {
			e = e || window.event;
			me.showPanel();
			e.preventDefault();
		};



		ol.control.Control.call(this, {
			element: element,
			target: options.target
		});

	};

	ol.inherits(wol.control.Legend, ol.control.Control);

	/**
	 * 显示面板
	 */
	wol.control.Legend.prototype.showPanel = function() {
		if (this.element.className != this.shownClassName) {
			this.element.className = this.shownClassName;
			this.renderPanel();
		}
	};

	/**
	 * 隐藏面板
	 */
	wol.control.Legend.prototype.hidePanel = function() {
		if (this.element.className != this.hiddenClassName) {
			this.element.className = this.hiddenClassName;
		}
	};

	/**
	 * Re-draw the layer panel to represent the current state of the layers.
	 */
	wol.control.Legend.prototype.renderPanel = function() {
		while(this.panel.firstChild) {
			this.panel.removeChild(this.panel.firstChild);
		}
		this.panel.innerHTML = this.html;

	};

	/**
	 * Set the map instance the control is associated with.
	 * @param {ol.Map} map The map instance.
	 */
	wol.control.Legend.prototype.setMap = function(map) {
		// Clean up listeners associated with the previous map
		for (var i = 0, key; i < this.mapListeners.length; i++) {
			this.getMap().unByKey(this.mapListeners[i]);
		}
		this.mapListeners.length = 0;
		// Wire up listeners etc. and store reference to new map
		ol.control.Control.prototype.setMap.call(this, map);
		if (map) {
			var this_ = this;
			this.mapListeners.push(map.on('pointerdown', function() {
				this_.hidePanel();
			}));
			this.renderPanel();
		}
	};

	/**
	 * Generate a UUID
	 * @returns {String} UUID
	 *
	 * Adapted from http://stackoverflow.com/a/2117523/526860
	 */
	wol.control.Legend.uuid = function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	}

	/**
	 * @private
	 * @desc Apply workaround to enable scrolling of overflowing content within an
	 * element. Adapted from https://gist.github.com/chrismbarr/4107472
	 */
	wol.control.Legend.enableTouchScroll_ = function(elm) {
		if(wol.control.Legend.isTouchDevice_()){
			var scrollStartPos = 0;
			elm.addEventListener("touchstart", function(event) {
				scrollStartPos = this.scrollTop + event.touches[0].pageY;
			}, false);
			elm.addEventListener("touchmove", function(event) {
				this.scrollTop = scrollStartPos - event.touches[0].pageY;
			}, false);
		}
	};

	/**
	 * @private
	 * @desc Determine if the current browser supports touch events. Adapted from
	 * https://gist.github.com/chrismbarr/4107472
	 */
	wol.control.Legend.isTouchDevice_ = function() {
		try {
			document.createEvent("TouchEvent");
			return true;
		} catch(e) {
			return false;
		}
	};



})(window);