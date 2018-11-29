/*
 * This file is part of the nivo project.
 *
 * Copyright 2016-present, Raphaël Benitte.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import React, { Component } from 'react'
import setDisplayName from 'recompose/setDisplayName'
import {
    renderAxesToCanvas,
    getRelativeCursor,
    isCursorInRect,
    Container,
    BasicTooltip,
    renderGridLinesToCanvas,
} from '@nivo/core'
import { renderLegendToCanvas } from '@nivo/legends'
import { generateGroupedBars, generateStackedBars } from './compute'
import { BarPropTypes } from './props'
import enhance from './enhance'

const findNodeUnderCursor = (nodes, margin, x, y) =>
    nodes.find(node =>
        isCursorInRect(node.x + margin.left, node.y + margin.top, node.width, node.height, x, y)
    )

class BarCanvas extends Component {
    componentDidMount() {
        this.ctx = this.surface.getContext('2d')
        this.draw(this.props)
    }

    shouldComponentUpdate(props) {
        if (
            this.props.outerWidth !== props.outerWidth ||
            this.props.outerHeight !== props.outerHeight ||
            this.props.isInteractive !== props.isInteractive ||
            this.props.theme !== props.theme
        ) {
            return true
        } else {
            this.draw(props)
            return false
        }
    }

    componentDidUpdate() {
        this.ctx = this.surface.getContext('2d')
        this.draw(this.props)
    }

    draw(props) {
        const {
            data,
            keys,
            getIndex,
            minValue,
            maxValue,

            width,
            height,
            outerWidth,
            outerHeight,
            pixelRatio,
            margin,

            layout,
            reverse,
            groupMode,
            padding,
            innerPadding,

            axisTop,
            axisRight,
            axisBottom,
            axisLeft,

            theme,
            getColor,

            legends,

            enableGridX,
            enableGridY,
        } = props

        this.surface.width = outerWidth * pixelRatio
        this.surface.height = outerHeight * pixelRatio

        this.ctx.scale(pixelRatio, pixelRatio)

        const options = {
            layout,
            reverse,
            data,
            getIndex,
            keys,
            minValue,
            maxValue,
            width,
            height,
            getColor,
            padding,
            innerPadding,
        }

        const result =
            groupMode === 'grouped' ? generateGroupedBars(options) : generateStackedBars(options)

        this.bars = result.bars

        this.ctx.fillStyle = theme.background
        this.ctx.fillRect(0, 0, outerWidth, outerHeight)
        this.ctx.translate(margin.left, margin.top)

        this.ctx.strokeStyle = '#dddddd'
        enableGridX &&
            renderGridLinesToCanvas(this.ctx, {
                width,
                height,
                scale: result.xScale,
                axis: 'x',
            })
        enableGridY &&
            renderGridLinesToCanvas(this.ctx, {
                width,
                height,
                scale: result.yScale,
                axis: 'y',
            })

        this.ctx.strokeStyle = '#dddddd'
        const legendDataForKeys = result.bars
            .filter(bar => bar.data.index === 0)
            .map(bar => ({
                id: bar.data.id,
                label: bar.data.id,
                color: bar.color,
                fill: bar.data.fill,
            }))
            .reverse()
        const legendDataForIndexes = result.bars
            .filter(bar => bar.data.id === keys[0])
            .map(bar => ({
                id: bar.data.indexValue,
                label: bar.data.indexValue,
                color: bar.color,
                fill: bar.data.fill,
            }))

        legends.forEach(legend => {
            let legendData
            if (legend.dataFrom === 'keys') {
                legendData = legendDataForKeys
            } else if (legend.dataFrom === 'indexes') {
                legendData = legendDataForIndexes
            }

            if (legendData === undefined) return null
            renderLegendToCanvas(this.ctx, {
                ...legend,
                data: legendData,
                containerWidth: width,
                containerHeight: height,
                itemTextColor: '#999',
                symbolSize: 16,
            })
        })

        renderAxesToCanvas(this.ctx, {
            xScale: result.xScale,
            yScale: result.yScale,
            width,
            height,
            top: axisTop,
            right: axisRight,
            bottom: axisBottom,
            left: axisLeft,
            theme,
        })

        result.bars.forEach(({ x, y, color, width, height }) => {
            this.ctx.fillStyle = color
            this.ctx.fillRect(x, y, width, height)
        })
    }

    handleMouseHover = (showTooltip, hideTooltip) => event => {
        if (!this.bars) return

        const { margin, theme, tooltip, getTooltipLabel, tooltipFormat } = this.props
        const [x, y] = getRelativeCursor(this.surface, event)

        const bar = findNodeUnderCursor(this.bars, margin, x, y)

        if (bar !== undefined) {
            showTooltip(
                <BasicTooltip
                    id={getTooltipLabel(bar.data)}
                    value={bar.data.value}
                    enableChip={true}
                    color={bar.color}
                    theme={theme}
                    format={tooltipFormat}
                    renderContent={
                        typeof tooltip === 'function'
                            ? tooltip.bind(null, { color: bar.color, ...bar.data })
                            : null
                    }
                />,
                event
            )
        } else {
            hideTooltip()
        }
    }

    handleMouseLeave = hideTooltip => () => {
        hideTooltip()
    }

    handleClick = event => {
        if (!this.bars) return

        const { margin, onClick } = this.props
        const [x, y] = getRelativeCursor(this.surface, event)

        const node = findNodeUnderCursor(this.bars, margin, x, y)
        if (node !== undefined) onClick(node.data, event)
    }

    render() {
        const { outerWidth, outerHeight, pixelRatio, isInteractive, theme } = this.props

        return (
            <Container isInteractive={isInteractive} theme={theme}>
                {({ showTooltip, hideTooltip }) => (
                    <canvas
                        ref={surface => {
                            this.surface = surface
                        }}
                        width={outerWidth * pixelRatio}
                        height={outerHeight * pixelRatio}
                        style={{
                            width: outerWidth,
                            height: outerHeight,
                        }}
                        onMouseEnter={this.handleMouseHover(showTooltip, hideTooltip)}
                        onMouseMove={this.handleMouseHover(showTooltip, hideTooltip)}
                        onMouseLeave={this.handleMouseLeave(hideTooltip)}
                        onClick={this.handleClick}
                    />
                )}
            </Container>
        )
    }
}

BarCanvas.propTypes = BarPropTypes

export default setDisplayName('BarCanvas')(enhance(BarCanvas))