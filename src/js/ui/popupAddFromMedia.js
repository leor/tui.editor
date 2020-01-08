/**
 * @fileoverview Implements PopupAddFromMedia
 */
import util from 'tui-code-snippet';

import LayerPopup from './layerpopup';
import i18n from '../i18n';

const CLASS_OK_BUTTON = 'te-ok-button';
const CLASS_CLOSE_BUTTON = 'te-close-button';
const CLASS_IMAGES_LIST = 'te-image-list';
const CLASS_IMAGE_CONTAINER = 'te-image-list-container';
const CLASS_TRYAGAIN_BUTTON = 'te-try-again-button';
const CLASS_LOADING_INDICATOR = 'te-loading-indicator';

/**
 * Class PopupAddImage
 * It implements an Image add from MEdia library
 * @param {LayerPopupOption} options - layer popup option
 * @ignore
 */
class PopupAddFromMedia extends LayerPopup {
  constructor(options) {
    const POPUP_CONTENT = `
            <div class="${CLASS_IMAGE_CONTAINER}">
              <ul class="${CLASS_IMAGES_LIST}"></ul>
              <button type="button" class="${CLASS_TRYAGAIN_BUTTON}">${i18n.get('Try again')}</button>
              <p class="${CLASS_LOADING_INDICATOR}">${i18n.get('Loading')}...</p>
            </div>
            <div class="te-button-section">
                <button type="button" class="${CLASS_OK_BUTTON}">${i18n.get('OK')}</button>
                <button type="button" class="${CLASS_CLOSE_BUTTON}">${i18n.get('Cancel')}</button>
            </div>
        `;
    options = util.extend({
      header: true,
      title: i18n.get('Add image'),
      className: 'te-popup-add-image tui-editor-popup',
      content: POPUP_CONTENT
    }, options);
    super(options);
  }

  /**
   * init instance.
   * store properties & prepare before initialize DOM
   * @param {LayerPopupOption} options - layer popup options
   * @private
   * @override
   */
  _initInstance(options) {
    super._initInstance(options);

    this._path = options.media.path;
    this._token = options.media.token;
    this.eventManager = options.eventManager;
    this._currentPage = 1;
    this.allLoaded = false;
    this._loading = false;
  }

  /**
   * initialize DOM, render popup
   * @private
   * @override
   */
  _initDOM() {
    super._initDOM();

    const $popup = this.$el;

    this._$imageList = $popup.find(`.${CLASS_IMAGES_LIST}`);
    this._loadingIndicator = $popup.find(`.${CLASS_LOADING_INDICATOR}`);
    this._tryButton = $popup.find(`.${CLASS_TRYAGAIN_BUTTON}`);
  }

  /**
   * bind DOM events
   * @private
   * @override
   */
  _initDOMEvent() {
    super._initDOMEvent();

    this.on('shown', () => this.loadData());
    this.on('hidden', () => this._reset());

    this.on(`click .${CLASS_CLOSE_BUTTON}`, () => this.hide());
    this.on(`click .${CLASS_OK_BUTTON}`, () => {
      const activeOne = this.$el.find('.active-media');

      if (activeOne.length) {
        this._applyImage(activeOne.find('img').data('full'), activeOne.data('alt'));
      }

      this.hide();
    });

    this._tryButton.on('click', () => {
      this.loadData();
    });

    this.on(`click .${CLASS_IMAGES_LIST} li`, (event) => {
      const activeOne = this.$el.find('.active-media');
      if (activeOne.length) {
        activeOne.removeClass('active-media');
      }

      if (activeOne.length === 0 || activeOne[0] !== event.target.classList.parentNode) {
        event.target.parentNode.classList.add('active-media');
      }
    });

    const _scroll = async (e) => {
      if (!this.allLoaded) {
        const scrollY = e.target.scrollTop;
        const visible = e.target.clientHeight;
        const pageHeight = e.target.scrollHeight;
        // small offset to start loading a bit earlier
        const bottomOfPage = visible + scrollY + 150 >= pageHeight;

        if (bottomOfPage || pageHeight < visible) {
          await this.loadData();
        }
      }
    };

    this.$el.find(`.${CLASS_IMAGE_CONTAINER}`)[0].addEventListener('scroll', _scroll);
  }

  /**
   * bind editor events
   * @private
   * @override
   */
  _initEditorEvent() {
    super._initEditorEvent();

    this.eventManager.listen('focus', () => this.hide());
    this.eventManager.listen('closeAllPopup', () => this.hide());

    this.eventManager.listen('openPopupAddFromMedia', () => {
      this.eventManager.emit('closeAllPopup');
      this.show();
    });
  }

  _applyImage(imageUrl, altText) {
    this.eventManager.emit('command', 'AddImage', {
      imageUrl,
      altText: altText || 'image'
    });
    this.hide();
  }

  /**
   * Remove popup
   * @override
   */
  remove() {
    super.remove();
  }

  async loadData() {
    if (!this._loading && !this.allLoaded) {
      this._loading = true;
      this._loadingIndicator.show();
      this._tryButton.hide();

      try {
        const r = await fetch(`${this._path}?page=${this._currentPage}&token=${this._token}`);
        const data = await r.json();

        this._currentPage += 1;

        data.data.forEach(t => {
          this._$imageList.append(`<li><span class="one-item-holder"><img src="${t.thumb}" data-full="${t.path}" data-alt="${t.description}"></span></li>`);
        });

        this.allLoaded = this._currentPage > data.last_page;
      } catch (e) {
        this._tryButton.show();
      }
      this._loadingIndicator.hide();
      this._loading = false;
    }
  }

  _reset() {
    this._currentPage = 1;
    this.allLoaded = false;
    this._loading = false;
  }
}

export default PopupAddFromMedia;
