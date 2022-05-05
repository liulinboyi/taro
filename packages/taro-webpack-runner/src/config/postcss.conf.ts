import * as path from 'path'
import * as constparse from 'postcss-plugin-constparse'
import { sync as resolveSync } from 'resolve'
import { IPostcssOption, TogglableOptions } from '@tarojs/taro/types/compile'
import { recursiveMerge, isNpmPkg } from '@tarojs/helper'

const defaultAutoprefixerOption = {
  enable: true,
  config: {
    flexbox: 'no-2009'
  }
}
const defaultPxtransformOption: {
  [key: string]: any
} = {
  enable: true,
  config: {
    platform: 'h5'
  }
}

const defaultHtmltransformOption: {
  [key: string]: any
} = {
  enable: true,
  config: {
    platform: 'h5',
    removeCursorStyle: false
  }
}

const defaultConstparseOption = {
  constants: [
    {
      key: 'taro-tabbar-height',
      val: '50PX'
    }
  ],
  platform: 'h5'
}

const optionsWithDefaults = ['autoprefixer', 'pxtransform', 'cssModules']

const plugins = [] as any[]

export const getPostcssPlugins = function (appPath: string, {
  designWidth,
  deviceRatio,
  postcssOption = {} as IPostcssOption
}) {
  if (designWidth) {
    defaultPxtransformOption.config.designWidth = designWidth
  }

  if (deviceRatio) {
    defaultPxtransformOption.config.deviceRatio = deviceRatio
  }

  const autoprefixerOption = recursiveMerge<TogglableOptions>({}, defaultAutoprefixerOption, postcssOption.autoprefixer)
  const pxtransformOption = recursiveMerge<TogglableOptions>({}, defaultPxtransformOption, postcssOption.pxtransform)
  const htmltransformOption = recursiveMerge({}, defaultHtmltransformOption, postcssOption.htmltransform)

  if (autoprefixerOption.enable) {
    const autoprefixer = require('autoprefixer')
    plugins.push(autoprefixer(autoprefixerOption.config))
  }

  if (pxtransformOption.enable) {
    const pxtransform = require('postcss-pxtransform')
    plugins.push(pxtransform(pxtransformOption.config))
  }

  if (htmltransformOption?.enable) {
    const htmlTransform = require('postcss-html-transform')
    plugins.push(htmlTransform(htmltransformOption.config))
  }

  plugins.push(constparse(defaultConstparseOption))

  Object.entries(postcssOption).forEach(([pluginName, pluginOption]) => {
    if (optionsWithDefaults.indexOf(pluginName) > -1) return
    if (!pluginOption || !pluginOption.enable) return

    if (!isNpmPkg(pluginName)) {
      // local plugin
      pluginName = path.join(appPath, pluginName)
    }

    try {
      const pluginPath = resolveSync(pluginName, { basedir: appPath })
      plugins.push(require(pluginPath)(pluginOption.config || {}))
    } catch (e) {
      const msg = e.code === 'MODULE_NOT_FOUND' ? `缺少postcss插件${pluginName}, 已忽略` : e
      console.log(msg)
    }
  })

  return plugins
}
