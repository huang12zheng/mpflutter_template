package com.mpflutter.runtime.components.basic;

import android.content.Context;
import android.graphics.RectF;
import android.util.SizeF;
import android.view.View;
import android.view.ViewGroup;

import androidx.recyclerview.widget.RecyclerView;

import com.mpflutter.runtime.components.MPUtils;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class WaterfallLayout extends RecyclerView.LayoutManager {

    public Context context;
    public boolean isPlain = false;
    public boolean isHorizontalScroll = false;
    public double[] padding = new double[4];
    public int clientWidth = 0;
    public int clientHeight = 0;
    public int crossAxisCount = 1;
    public double crossAxisSpacing = 0.0;
    public double mainAxisSpacing = 0.0;
    public JSONArray items;
    public List<RectF> itemLayouts = new ArrayList();
    public double maxVLength = 0.0;
    public double maxVLengthPx = 0.0;

    WaterfallLayout(Context context) {
        this.context = context;
    }

    public void prepareLayout() {
        if (items == null) return;
        if (isPlain) {
            preparePlainLayout();
        }
        else {
            prepareWaterfallLayout();
        }
    }

    void preparePlainLayout() {
        List<RectF> layouts = new ArrayList<>();
        double paddingTop = padding[0];
        double paddingLeft = padding[1];
        double currentX = paddingLeft;
        double currentY = paddingTop;
        double maxVLength = 0.0;
        for (int i = 0; i < items.length(); i++) {
            JSONObject obj = items.optJSONObject(i);
            if (obj == null) continue;
            SizeF itemSize = sizeForItem(obj);
            double itemWidth = itemSize.getWidth();
            double itemHeight = itemSize.getHeight();
            if (isHorizontalScroll) {
                RectF rect = new RectF((float)currentX, (float)currentY, (float)(currentX + itemWidth), (float)(currentY + itemHeight));
                currentY += itemHeight + crossAxisSpacing;
                if (currentY + itemHeight - clientHeight > 0.1 && i + 1 < items.length()) {
                    currentY = paddingTop;
                    currentX += itemWidth + mainAxisSpacing;
                }
                maxVLength = Math.max(rect.right, maxVLength);
                layouts.add(rect);
            }
            else {
                RectF rect = new RectF((float)currentX, (float)currentY, (float)(currentX + itemWidth), (float)(currentY + itemHeight));
                currentX += itemWidth + crossAxisSpacing;
                if (currentX + itemWidth - clientWidth > 0.1 && i + 1 < items.length()) {
                    currentX = paddingLeft;
                    currentY += itemHeight + mainAxisSpacing;
                }
                maxVLength = Math.max(rect.bottom, maxVLength);
                layouts.add(rect);
            }
        }
        maxVLength += padding[2];
        itemLayouts = layouts;
        this.maxVLength = maxVLength;
        this.maxVLengthPx = MPUtils.dp2px(maxVLength, context);
    }

    void prepareWaterfallLayout() {
        if (crossAxisCount <= 0) {
            itemLayouts = new ArrayList();
            return;
        }
        double paddingTop = padding[0];
        double paddingLeft = padding[1];
        int currentRowIndex = 0;
        Map<Integer, RectF> layoutCache = new HashMap();
        List<RectF> layouts = new ArrayList();
        double maxVLength = 0.0;
        for (int i = 0; i < items.length(); i++) {
            JSONObject obj = items.optJSONObject(i);
            if (obj == null) continue;
            SizeF itemSize = sizeForItem(obj);
            double itemWidth = itemSize.getWidth();
            double itemHeight = itemSize.getHeight();
            double currentVLength = isHorizontalScroll ? paddingLeft : paddingTop;
            {
                int index = currentRowIndex;
                int nextIndex = index + 1 >= crossAxisCount ? 0 : index + 1;
                if (layoutCache.containsKey(index) && layoutCache.containsKey(nextIndex)) {
                    RectF curRect = layoutCache.get(index);
                    RectF nextRect = layoutCache.get(nextIndex);
                    if (isHorizontalScroll) {
                        if (nextRect.right < curRect.right) {
                            currentRowIndex = nextIndex;
                        }
                        else {
                            currentRowIndex = index;
                        }
                    }
                    else {
                        if (nextRect.bottom < curRect.bottom) {
                            currentRowIndex = nextIndex;
                        }
                        else {
                            currentRowIndex = index;
                        }
                    }
                }
                else {
                    currentRowIndex = index;
                }
            }

            if (layoutCache.containsKey(currentRowIndex)) {
                RectF curRect = layoutCache.get(currentRowIndex);
                if (isHorizontalScroll) {
                    currentVLength = curRect.right;
                    if (i >= crossAxisCount) {
                        currentVLength += mainAxisSpacing;
                    }
                }
                else {
                    currentVLength = curRect.bottom;
                    if (i >= crossAxisCount) {
                        currentVLength += mainAxisSpacing;
                    }
                }
            }
            else {
                currentVLength = isHorizontalScroll ? paddingLeft : paddingTop;
            }

            if (isHorizontalScroll) {
                RectF rect = new RectF(
                        (float)currentVLength,
                        (float)(paddingTop + itemHeight * currentRowIndex + currentRowIndex * crossAxisSpacing),
                        (float)(currentVLength + itemWidth),
                        (float)((paddingTop + itemHeight * currentRowIndex + currentRowIndex * crossAxisSpacing) + itemHeight)
                );
                layoutCache.put(currentRowIndex, rect);
                currentRowIndex = (currentRowIndex + 1) % crossAxisCount;
                maxVLength = Math.max(currentVLength + itemWidth, maxVLength);
                layouts.add(rect);
            }
            else {
                RectF rect = new RectF(
                        (float)(paddingLeft + itemWidth * currentRowIndex + currentRowIndex * crossAxisSpacing),
                        (float)currentVLength,
                        (float)((paddingLeft + itemWidth * currentRowIndex + currentRowIndex * crossAxisSpacing) + itemWidth),
                        (float)(currentVLength + itemHeight)
                );
                layoutCache.put(currentRowIndex, rect);
                currentRowIndex = (currentRowIndex + 1) % crossAxisCount;
                maxVLength = Math.max(currentVLength + itemHeight, maxVLength);
                layouts.add(rect);
            }
        }
        maxVLength += padding[2];
        itemLayouts = layouts;
        this.maxVLength = maxVLength;
        this.maxVLengthPx = MPUtils.dp2px(maxVLength, context);
    }

    SizeF sizeForItem(JSONObject data) {
        JSONObject constraints = data.optJSONObject("constraints");
        if (constraints != null) {
            return new SizeF((float)constraints.optDouble("w", 0.0), (float)constraints.optDouble("h", 0.0));
        }
        return new SizeF(0, 0);
    }

    @Override
    public RecyclerView.LayoutParams generateDefaultLayoutParams() {
        return new RecyclerView.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    @Override
    public void onLayoutChildren(RecyclerView.Recycler recycler, RecyclerView.State state) {
        detachAndScrapAttachedViews(recycler);
        if (getItemCount() == 0) {
            return;
        }
        for (int i = 0; i < getItemCount() && i < itemLayouts.size(); i++) {
            View child = recycler.getViewForPosition(i);
            addView(child);
            measureChildWithMargins(child, 0, 0);
            RectF rect = itemLayouts.get(i);
            layoutDecorated(child, MPUtils.dp2px(rect.left, child.getContext()), MPUtils.dp2px(rect.top, child.getContext()), MPUtils.dp2px(rect.right, child.getContext()), MPUtils.dp2px(rect.bottom, child.getContext()));
        }
    }

    @Override
    public boolean canScrollVertically() {
        return !isHorizontalScroll;
    }

    @Override
    public boolean canScrollHorizontally() {
        return isHorizontalScroll;
    }

    private int mSumDy = 0;

    @Override
    public int scrollHorizontallyBy(int dx, RecyclerView.Recycler recycler, RecyclerView.State state) {
        int travel = dx;
        boolean zero = false;
        if (mSumDy + dx < 0) {
            travel = -mSumDy;
            zero = true;
        } else if (mSumDy + dx > maxVLengthPx - getHorizontallySpace()) {
            travel = (int)maxVLengthPx - getHorizontallySpace() - mSumDy;
            zero = true;
        }
        if (zero == true && maxVLengthPx <= getWidth()) {
            return 0;
        }
        mSumDy += travel;
        offsetChildrenHorizontal(-travel);
        if (zero) {
            return 0;
        }
        return dx;
    }

    private int getHorizontallySpace() {
        return getWidth() - getPaddingLeft() - getPaddingRight();
    }

    @Override
    public int scrollVerticallyBy(int dy, RecyclerView.Recycler recycler, RecyclerView.State state) {
        int travel = dy;
        boolean zero = false;
        if (mSumDy + dy < 0) {
            travel = -mSumDy;
            zero = true;
        } else if (mSumDy + dy > maxVLengthPx - getVerticalSpace()) {
            travel = (int)maxVLengthPx - getVerticalSpace() - mSumDy;
            zero = true;
        }
        if (zero == true && maxVLengthPx <= getHeight()) {
            return 0;
        }
        mSumDy += travel;
        // 平移容器内的item
        offsetChildrenVertical(-travel);
        if (zero) {
            return 0;
        }
        return dy;
    }

    private int getVerticalSpace() {
        return getHeight() - getPaddingBottom() - getPaddingTop();
    }
}
