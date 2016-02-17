import L from 'leaflet';
import { cleanUrl } from '../Util';
import {cors} from '../Support';
import mapService from '../Services/MapService';

export var DynamicMapLayerAdvanced = L.Layer.extend({

  options: {
    opacity: 1,
    position: 'front',
    useCors: cors,
    attribution: null,
    interactive: false,
    alt: '',
    updateInterval: 150,
    layers: false,
    layerDefs: false,
    timeOptions: false,
    format: 'png24',
    transparent: true,
    f: 'json'
  },

  //fixed
  initialize: function (options) {
    options.url = cleanUrl(options.url);
    this.service = mapService(options);
    this.service.addEventParent(this);
    this._zoomAnimated = true;
    if ((options.proxy || options.token) && options.f !== 'json') {
      options.f = 'json';
    }
    L.Util.setOptions(this, options);

    this._update = L.Util.throttle(this._update, this.options.updateInterval, this);
  },

  //fixed from rasterlayer
  onAdd: function (map) {
    map.on('moveend', this._update, this);

    if ((!this._singleImages) || (this._singleImages.length==0)){
      this._update();
    }
    else{
      
    }

    

    if (this._popup) {
      this._map.on('click', this._getPopupData, this);
      this._map.on('dblclick', this._resetPopupState, this);
    }
  },

  //fixed from rasterlayer
  onRemove: function () {
    if (this._popup) {
      this._map.off('click', this._getPopupData, this);
      this._map.off('dblclick', this._resetPopupState, this);
    }

    this._map.off('moveend', this._update, this);
  },

  //fixed
  getEvents: function () {
    var events = {
      zoom: this._reset,
      viewreset: this._reset
    };

    if (this._zoomAnimated) {
      events.zoomanim = this._animateZoom;
    }

    return events;
  },

  //fixed
  _animateZoom: function (e) {
    this._forAllSingleImages(
      function(img){
        var scale = this._map.getZoomScale(e.zoom),
        offset = this._map._latLngToNewLayerPoint(img.position.getNorthWest(), e.zoom, e.center);
        L.DomUtil.setTransform(img, offset, scale);
      }
    );  
  },

  //fixed
  _reset: function () {
    this._forAllSingleImages(
      function(img){
        this._setImagePosition(img, img.position);
      }
    );
  },

  //old
  getDynamicLayers: function () {
    return this.options.dynamicLayers;
  },

  //old
  setDynamicLayers: function (dynamicLayers) {
    this.options.dynamicLayers = dynamicLayers;
    this._update();
    return this;
  },

  //old
  getLayers: function () {
    return this.options.layers;
  },

  //old
  setLayers: function (layers) {
    this.options.layers = layers;
    this._update();
    return this;
  },

  //old
  getLayerDefs: function () {
    return this.options.layerDefs;
  },

  //old
  setLayerDefs: function (layerDefs) {
    this.options.layerDefs = layerDefs;
    this._update();
    return this;
  },

  //old
  getTimeOptions: function () {
    return this.options.timeOptions;
  },

  //old
  setTimeOptions: function (timeOptions) {
    this.options.timeOptions = timeOptions;
    this._update();
    return this;
  },

  //old
  query: function () {
    return this.service.query();
  },

  //old
  identify: function () {
    return this.service.identify();
  },

  //old
  find: function () {
    return this.service.find();
  },

  //fixed from rasterlayer
  bringToFront: function () {
    this.options.position = 'front';
    this._forAllSingleImages(
      function(img) { 
        L.DomUtil.toFront(img);
       }
    );
    return this;
  },

  //fixed from rasterlayer
  bringToBack: function () {
    this.options.position = 'back';
    this._forAllSingleImages(
      function(img) { 
        L.DomUtil.toBack(img);
       }
    );
    return this;
  },

  //old from rasterlayer
  getAttribution: function () {
    return this.options.attribution;
  },

  //old from rasterlayer
  getOpacity: function () {
    return this.options.opacity;
  },

  //fixed from rasterlayer
  setOpacity: function (opacity) {
    this.options.opacity = opacity;
    this._forAllSingleImages(
      function(img) { 
        L.DomUtil.setOpacity(img, this.options.opacity);
       }
    );
    return this;
  },

  //old from rasterlayer
  getTimeRange: function () {
    return [this.options.from, this.options.to];
  },

  //old from rasterlayer
  setTimeRange: function (from, to) {
    this.options.from = from;
    this.options.to = to;
    this._update();
    return this;
  },

  //old from rasterlayer
  metadata: function (callback, context) {
    this.service.metadata(callback, context);
    return this;
  },

  //old from rasterlayer
  authenticate: function (token) {
    this.service.authenticate(token);
    return this;
  },

  //old
  _getPopupData: function (e) {
    var callback = L.Util.bind(function (error, featureCollection, response) {
      if (error) { return; } // we really can't do anything here but authenticate or requesterror will fire
      setTimeout(L.Util.bind(function () {
        this._renderPopup(e.latlng, error, featureCollection, response);
      }, this), 300);
    }, this);

    var identifyRequest = this.identify().on(this._map).at(e.latlng);

    if (this.options.layers) {
      identifyRequest.layers('visible:' + this.options.layers.join(','));
    } else {
      identifyRequest.layers('visible');
    }

    identifyRequest.run(callback);

    // set the flags to show the popup
    this._shouldRenderPopup = true;
    this._lastClick = e.latlng;
  },

  //old from rasterlayer
  _renderPopup: function (latlng, error, results, response) {
    latlng = L.latLng(latlng);
    if (this._shouldRenderPopup && this._lastClick.equals(latlng)) {
      // add the popup to the map where the mouse was clicked at
      var content = this._popupFunction(error, results, response);
      if (content) {
        this._popup.setLatLng(latlng).setContent(content).openOn(this._map);
      }
    }
  },
  
  //old from rasterlayer
  bindPopup: function (fn, popupOptions) {
    this._shouldRenderPopup = false;
    this._lastClick = false;
    this._popup = L.popup(popupOptions);
    this._popupFunction = fn;
    if (this._map) {
      this._map.on('click', this._getPopupData, this);
      this._map.on('dblclick', this._resetPopupState, this);
    }
    return this;
  },
  
  //old from rasterlayer
  unbindPopup: function () {
    if (this._map) {
      this._map.closePopup(this._popup);
      this._map.off('click', this._getPopupData, this);
      this._map.off('dblclick', this._resetPopupState, this);
    }
    this._popup = false;
    return this;
  },

  //old from rasterlayer
  _resetPopupState: function (e) {
    this._shouldRenderPopup = false;
    this._lastClick = e.latlng;
  },

  //fixed
  _initImage: function () {
    var img = L.DomUtil.create('img','leaflet-image-layer ' + (this._zoomAnimated ? 'leaflet-zoom-animated' : ''));
    img.onselectstart = L.Util.falseFn;
    img.onmousemove = L.Util.falseFn;
    img.style.zIndex = this.options.zIndex;
    img.alt = this.options.alt;
    
    if (this.options.opacity < 1) {
        L.DomUtil.setOpacity(img, this.options.opacity);
    }
    
    return img;
  },

  //fixed
  _imageLoaded:function(params){
    var image = this._setImagePosition(params.image, params.mapParams.position);
                
    this.getPane(this.options.pane).appendChild(image);

    this._singleImages.push(image);
  },

  //fixed
  _setImagePosition:function(image,position){
    var bounds = new L.Bounds(
            this._map.latLngToLayerPoint(position.getNorthWest()),
            this._map.latLngToLayerPoint(position.getSouthEast())),
        size = bounds.getSize();

    L.DomUtil.setPosition(image, bounds.min);

    image.style.width  = size.x + 'px';
    image.style.height = size.y + 'px';

    return image;
  },


  //fixed
  _renderImages: function (params) {
    //clear
    this._forAllSingleImages( function(img) { this.getPane(this.options.pane).removeChild(img); });

    this._singleImages = [];

    if (this._map) {
      for (var i=0;i<params.length;i++){
        var p = params[i];

        var img = this._initImage();
        img.position = p.position;
        img.onload = L.bind(this._imageLoaded, this, { image: img, mapParams: p });
        img.src = p.href;
      }

    }
  },


  //old from rasterlayer
  _renderImage: function (url, bounds) {
    if (this._map) {
      // create a new image overlay and add it to the map
      // to start loading the image
      // opacity is 0 while the image is loading
      var image = new Overlay(url, bounds, {
        opacity: 0,
        crossOrigin: this.options.useCors,
        alt: this.options.alt,
        pane: this.options.pane || this.getPane(),
        interactive: this.options.interactive
      }).addTo(this._map);

      // once the image loads
      image.once('load', function (e) {
        if (this._map) {
          var newImage = e.target;
          var oldImage = this._currentImage;

          // if the bounds of this image matches the bounds that
          // _renderImage was called with and we have a map with the same bounds
          // hide the old image if there is one and set the opacity
          // of the new image otherwise remove the new image
          if (newImage._bounds.equals(bounds) && newImage._bounds.equals(this._map.getBounds())) {
            this._currentImage = newImage;

            if (this.options.position === 'front') {
              this.bringToFront();
            } else {
              this.bringToBack();
            }

            if (this._map && this._currentImage._map) {
              this._currentImage.setOpacity(this.options.opacity);
            } else {
              this._currentImage._map.removeLayer(this._currentImage);
            }

            if (oldImage && this._map) {
              this._map.removeLayer(oldImage);
            }

            if (oldImage && oldImage._map) {
              oldImage._map.removeLayer(oldImage);
            }
          } else {
            this._map.removeLayer(newImage);
          }
        }

        this.fire('load', {
          bounds: bounds
        });
      }, this);

      this.fire('loading', {
        bounds: bounds
      });
    }
  },

  //fixed from rasterlayer
  _update: function () {
    if (!this._map) {
      return;
    }

    var zoom = this._map.getZoom();

    if (this._animatingZoom) {
      return;
    }

    if (this._map._panTransition && this._map._panTransition._inProgress) {
      return;
    }

    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
      return;
    }

    var params = this._buildExportParams();

    this._requestExport(params);
  },

  //fixed
  _buildExportParams: function () {

    var singleMapParamsArray = [];

    var wholeBounds = this._map.getBounds();
    var wholeSize = this._map.getSize();

    var min = wholeBounds.getSouthWest();
    var max = wholeBounds.getNorthEast();

    var newXmax = min.lng;
    var newXmin = min.lng;
    var i = 0;

    var d = (newXmin + 180) / 360;
    var sign = Math.sign(d);
    sign = (sign === 0) ? 1 : sign;
    var coef = sign * Math.floor(Math.abs(d));

    while (newXmax < max.lng)
    {
      newXmax =  360 * (coef + i) + sign*180;
      
      if (newXmax > max.lng)
      {
          newXmax = max.lng;
      }

      var normXMin = newXmin;
      var normXMax = newXmax;

      if ((newXmin<-180) | (newXmax>180))
      {
          var d2 = Math.floor((newXmin + 180) / 360);
          normXMin -= d2 * 360;
          normXMax -= d2 * 360;
      }

      var singleBounds =  L.latLngBounds(L.latLng(min.lat, normXMin), L.latLng(max.lat, normXMax));
      var positionBounds = L.latLngBounds(L.latLng(min.lat, newXmin), L.latLng(max.lat, newXmax));
      var width = (wholeSize.x* ( (newXmax- newXmin)/(max.lng - min.lng) ));
      var singleSize = { x: width, y: wholeSize.y };
      var singleExportParams = this._buildSingleExportParams(singleBounds, singleSize);
      
      singleMapParamsArray.push({position:positionBounds,  bounds: singleBounds, size: singleSize, params: singleExportParams });
      newXmin = newXmax;
      i++;
    }

    return singleMapParamsArray;
  },

  //fixed
  _buildSingleExportParams: function(bounds, size){
    var ne = this._map.options.crs.project(bounds.getNorthEast());
    var sw = this._map.options.crs.project(bounds.getSouthWest());
    var sr = parseInt(this._map.options.crs.code.split(':')[1], 10);

    // ensure that we don't ask ArcGIS Server for a taller image than we have actual map displaying
    var top = this._map.latLngToLayerPoint(bounds._northEast);
    var bottom = this._map.latLngToLayerPoint(bounds._southWest);

    if (top.y > 0 || bottom.y < size.y) {
      size.y = bottom.y - top.y;
    }

    var params = {
      bbox: [sw.x, sw.y, ne.x, ne.y].join(','),
      size: size.x + ',' + size.y,
      dpi: 96,
      format: this.options.format,
      transparent: this.options.transparent,
      bboxSR: sr,
      imageSR: sr
    };

    if (this.options.dynamicLayers) {
      params.dynamicLayers = this.options.dynamicLayers;
    }

    if (this.options.layers) {
      params.layers = 'show:' + this.options.layers.join(',');
    }

    if (this.options.layerDefs) {
      params.layerDefs = JSON.stringify(this.options.layerDefs);
    }

    if (this.options.timeOptions) {
      params.timeOptions = JSON.stringify(this.options.timeOptions);
    }

    if (this.options.from && this.options.to) {
      params.time = this.options.from.valueOf() + ',' + this.options.to.valueOf();
    }

    if (this.service.options.token) {
      params.token = this.service.options.token;
    }

    return params;
  },

  //fixed
  _requestExport: function (params) {
    for(var i=0; i< params.length;i++){
      var singleParam = params[i];
      if (this.options.f === 'json') {
        this.service.request('export', currentParam.params, function (error, response) {
          if (error) { return; } // we really can't do anything here but authenticate or requesterror will fire
          singleParam.href = response.href;
        }, this);
      } else {
        singleParam.params.f = 'image';
        singleParam.href = this.options.url + 'export' + L.Util.getParamString(singleParam.params);
      }
    }
    this._renderImages(params);
  },

  //fixed
  _forAllSingleImages: function(f){
    if (this._singleImages){
      for(var i=0;i<this._singleImages.length;i++){
        f.call(this,this._singleImages[i]);
      } 
    }
  }

});

export function dynamicMapLayerAdvanced (url, options) {
  return new DynamicMapLayerAdvanced(url, options);
}

export default dynamicMapLayerAdvanced;