(function(pluginName){
	'use strict';
	
	if (UpdateManager.currentVersion < 0.202) {
		alert('[Kyo\'s I18N] Please update your game to use this mod.');
		return;
	}
	
	if (UpdateManager.currentVersion > 0.202) {
		console.log('[Kyo\'s I18N] This mod may be outdated.');
	}
	
	window.Imported = window.Imported || {};
	
	Imported.Kyo_I18N = true;
	
	window.Kyo = window.Kyo || {};
	
	Kyo.I18N = {
		version: '1.0.0-beta'
	}
	
	var $ = Kyo.I18N;
	
	$.Settings = (function() {
		
		return {
			debug: false
		};
	})();

	$.GettextFormatter = (function() {
		
		function GettextFormatter() {
			throw new Error('Class can\'t be instantiated');
		};

		GettextFormatter.ext = {
			source: 'pot',
			main: 'po'
		};

		GettextFormatter.JSON_REGEXP = new RegExp([
			'msgid "([^"]*)"',
			'msgstr "([^"]*)"\\n'
		].join('\\n'), 'gi');

		GettextFormatter.encode = function(data) {
			var text = [
				'msgid ""',
				'msgstr ""',
				'"MIME-Version: 1.0\\n"',
				'"Content-Type: text/plain; charset=UTF-8\\n"', 
				'"Content-Transfer-Encoding: 8bit\\n"',
				'',
				''
			].join('\n');
			
			for (var key in data) {
				text += [
					'msgid ' + JSON.stringify(key),
					'msgstr ' + JSON.stringify(data[key]) + '\n',
					''
				].join('\n');
			}
			
			return text;
		};

		GettextFormatter.decode = function(data) {
			var match;
			var result = {};
			
			this.JSON_REGEXP.lastIndex = 0;
			
			while ((match = this.JSON_REGEXP.exec(data)) !== null) {
				var key = match[1];
				var value = match[2];
			
				result[key] = value;
			}
			
			return result;
		};
		
		return GettextFormatter;
	})();

	$.JsonFormatter = (function() {
		
		function JsonFormatter() {
			throw new Error('Class can\'t be instantiated');
		};

		JsonFormatter.ext = {
			source: 'json',
			main: 'json'
		};

		JsonFormatter.encode = function(database) {
			return JSON.stringify(database, null, 4);
		};

		JsonFormatter.decode = function(database) {
			return JSON.parse(database);
		};
		
		return JsonFormatter;
	})();
	
	$.DataManager = (function() {
		
		function DataManager() {
			throw new Error('Class can\'t be instantiated');
		};

		DataManager.import = function(formatter) {
			var fileName = 'translation.' + formatter.ext.main;
			var filePath = path.join(ModManager._path, pluginName, fileName);
			
			var data = fs.readFileSync(filePath, 'utf8');
			
			return formatter.decode(data);
		};

		DataManager.export = function(formatter, data) {
			var fileName = 'translation.' + formatter.ext.source;
			var filePath = path.join(ModManager._path, pluginName, fileName);

			fs.writeFileSync(filePath, formatter.encode(data));
		};
		
		DataManager.index = function() {
			this._sources = [{
				name: TextManager.language,
				format: 'default',
				source: $dataStrings
			}];
			
			var dir = path.join(ModManager._path, pluginName, 'languages');
			
			fs.readdirSync(dir).forEach(function(lang) {
				var filePath = path.join(dir, lang);
				var json = fs.readFileSync(path.join(filePath, 'settings.json'), 'utf8');
				var data = JSON.parse(json);
				
				this._sources.push({
					name: data.name,
					format: data.format,
					path: filePath
				});
			}, this);
		};
		
		return DataManager;
	})();
	
	$.LanguageManager = (function() {
		
		function LanguageManager() {
			throw new Error('This is a static class.');
		}
		
		LanguageManager.set = function(index) {
			var lang = $.DataManager._sources[index];
			
			TextManager.language = lang.name;
			
			if (index === 0) {				
				$dataStrings = lang.source;
				return;
			}
			
			var formatter;
			
			switch (lang.format) {
				case 'gettext':
					formatter = $.GettextFormatter;
					break
				default:
					formatter = $.JsonFormatter;
			}
			
			var fileName = 'translation.' + formatter.ext.main;
			var filePath = path.join(lang.path, fileName);

			var data = fs.readFileSync(filePath, 'utf8');
			
			$dataStrings = formatter.decode(data);
		};
		
		return LanguageManager;
	})();
	
	$.ModManager = function() {
		throw new Error('This is a static class.');
	};
	
	$.ModManager._symbol = 'kyo-i18n';
	$.ModManager._index = 0;
	
	$.ModManager.makeModList = function(modWindow) {
		modWindow.addCommand(t('Language'), this._symbol);
	};
	
	$.ModManager.options_statusText = function(modWindow, symbol) {
		if (symbol == this._symbol) {
			return $.DataManager._sources[this._index].name;
		}
	};
	
	$.ModManager.options_cursorRight = function(modWindow, symbol, value, wrap) {
		if (symbol == this._symbol) {
			this._index += 1;
			this._index %= $.DataManager._sources.length;
			SoundManager.playCursor();
			return true;
		}
	};
	
	$.ModManager.options_cursorLeft = function(modWindow, symbol, value, wrap) {
		if (symbol == this._symbol) {
			this._index -= 1;
			this._index += $.DataManager._sources.length;
			this._index %= $.DataManager._sources.length;
			SoundManager.playCursor();
			return true;
		}
	};
	
	$.ModManager.configManager_makeData = function(config) {
		$.LanguageManager.set(this._index);
		
		config.Kyo_I18N = {
			language: TextManager.language
		}
	};
	
	(function() {
		if ($.Settings.debug) {
			var gui = require('nw.gui');
			var win = gui.Window.get();
			win.showDevTools();
		}
		
		$.DataManager.index();
		
		if (
			ConfigManager.loadedConfig 
			&& ConfigManager.loadedConfig.Kyo_I18N
		) {
			var lang = ConfigManager.loadedConfig.Kyo_I18N.language;
			var index = -1;
			
			for (var i = 0; i < $.DataManager._sources.length; i++) {
				if ($.DataManager._sources[i].name === lang) {
					index = i;
					break;
				}
			}
			
			if (index !== -1) {
				$.ModManager._index = index;
				$.LanguageManager.set(index);
			}
		}
	})();
	
	ContentManager.registerContentClass($.ModManager);
})(window.pluginName);