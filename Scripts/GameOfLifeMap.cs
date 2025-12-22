using UnityEngine;
using System.Collections.Generic;
using UnityEngine.UI;

/// <summary>
/// 3D cellular automaton with adaptive rules that transition between growth, decay, and stable phases
/// based on population thresholds. Uses sparse evaluation (only cells near live regions are processed)
/// and object pooling for performance.
/// </summary>
public class GameOfLifeMap : MonoBehaviour
{
    public Text StatsText_;
    public GameObject BlockModel;

    CameraMove cameraMoveObject;
    CameraMove CameraMove_ => cameraMoveObject ??= FindObjectOfType<CameraMove>();

    /// <summary>
    /// Cell state: neighbor count for rule evaluation, flags for update list and visibility.
    /// </summary>
    public class SBlock
    {
        public int iNeighbors;
        public bool bIsInUpdateList;
        public bool bIsVisible;

        public void Reset()
        {
            iNeighbors = 0;
            bIsInUpdateList = false;
            bIsVisible = false;
        }
    }

    // Grid dimensions (cubic)
    public int iXMax_ = 100;
    public int iYMax_ = 100;
    public int iZMax_ = 100;

    // Pending dimensions for next reset
    public int iNextXMax_ = 100;
    public int iNextYMax_ = 100;
    public int iNextZMax_ = 100;

    int iMaxIndex_ = 0;
    int iRadius_ = 5;
    float fBlockSize_ = 1f;

    // Adaptive state: 1=growth, 0=stable, -1=decay
    int iGrowthState_ = 1;
    int iTotalCount_ = 0;

    // Grid storage: 1D array indexed by CalcBlockIndex(x,y,z)
    SBlock[] BlockMap_;

    // Sparse lists: only process cells that might change
    List<int> UpdateBlocks_;
    List<int> VisibleBlocks_;

    // Object pooling for cube GameObjects
    Queue<GameObject> UnusedBlockQueue_;
    GameObject[] BlockModels_;

    public Vector3 GetCenter() => new Vector3(
        iXMax_ * fBlockSize_ / 2f,
        iYMax_ * fBlockSize_ / 2f,
        iZMax_ * fBlockSize_ / 2f
    );

    void Awake()
    {
        UnusedBlockQueue_ = new Queue<GameObject>();
        UpdateBlocks_ = new List<int>();
        VisibleBlocks_ = new List<int>();
        ResetGame();
    }

    public void ChangeRadius(int iIncrement)
    {
        iRadius_ += iIncrement;
        UpdateDisplay();
    }

    public void ChangeMapSize(int iIncrement)
    {
        iNextXMax_ += iIncrement;
        iNextYMax_ += iIncrement;
        iNextZMax_ += iIncrement;
        UpdateDisplay();
    }

    void UpdateDisplay()
    {
        StatsText_.text = $"{iNextXMax_}\n{iRadius_}";
    }

    public void ResetGame()
    {
        // Return all active blocks to pool
        if (BlockModels_ != null)
        {
            foreach (var block in BlockModels_)
            {
                if (block != null)
                {
                    block.SetActive(false);
                    UnusedBlockQueue_.Enqueue(block);
                }
            }
        }

        if (BlockMap_ != null)
        {
            foreach (var block in BlockMap_)
                block?.Reset();
        }

        UpdateBlocks_.Clear();
        VisibleBlocks_.Clear();

        // Apply pending dimensions
        iXMax_ = iNextXMax_;
        iYMax_ = iNextYMax_;
        iZMax_ = iNextZMax_;

        iMaxIndex_ = iXMax_ * iYMax_ * iZMax_;
        BlockMap_ = new SBlock[iMaxIndex_];
        for (int i = 0; i < iMaxIndex_; i++)
            BlockMap_[i] = new SBlock();

        BlockModels_ = new GameObject[iMaxIndex_];
        Application.targetFrameRate = 1;

        // Seed cells within spherical region at grid center
        int midX = iXMax_ / 2;
        int midY = iYMax_ / 2;
        int midZ = iZMax_ / 2;
        iTotalCount_ = 0;

        for (int x = 0; x < iXMax_; x++)
        {
            for (int y = 0; y < iYMax_; y++)
            {
                for (int z = 0; z < iZMax_; z++)
                {
                    float dist = Mathf.Sqrt(
                        (x - midX) * (x - midX) +
                        (y - midY) * (y - midY) +
                        (z - midZ) * (z - midZ)
                    );

                    if (dist > iRadius_) continue;

                    int index = CalcBlockIndex(x, y, z);
                    if (!IsInRange(index)) continue;

                    var block = GetBlock(index);
                    if (!block.bIsVisible)
                    {
                        block.bIsVisible = true;
                        VisibleBlocks_.Add(index);
                        iTotalCount_++;
                    }
                }
            }
        }

        CameraMove_.SetCenter(GetCenter());
        Camera.main.transform.position = new Vector3(
            Camera.main.transform.position.x,
            iYMax_ * fBlockSize_ / 2f,
            -iYMax_ * fBlockSize_ / 9f
        );
        Camera.main.transform.localRotation = Quaternion.identity;

        UpdateDisplay();
    }

    void FixedUpdate() => DoUpdate();

    // Population thresholds for state transitions
    int DecayUpperLimit => iMaxIndex_ / 300;
    int GrowthLowerLimit => iMaxIndex_ / 2000;

    /// <summary>
    /// Main simulation loop: update growth state, run rules on visible cells, compile new visible set.
    /// </summary>
    void DoUpdate()
    {
        // State machine: high population triggers decay, low triggers growth
        if (iTotalCount_ > DecayUpperLimit)
            iGrowthState_ = -1;
        else if (iTotalCount_ < GrowthLowerLimit)
            iGrowthState_ = 1;

        iTotalCount_ = 0;

        foreach (int index in VisibleBlocks_)
            RunRule(index);

        CompileVisibleSet();
        iTotalCount_ = VisibleBlocks_.Count;
    }

    /// <summary>
    /// Evaluate rule results and update visible/dead cell lists.
    /// </summary>
    void CompileVisibleSet()
    {
        VisibleBlocks_.Clear();

        foreach (int index in UpdateBlocks_)
        {
            if (!IsInRange(index)) continue;

            var block = GetBlock(index);
            if (IsOn(block.bIsVisible, block.iNeighbors))
            {
                block.bIsVisible = true;
                VisibleBlocks_.Add(index);
                UseBlock(index);
            }
            else
            {
                if (BlockModels_[index] != null)
                {
                    BlockModels_[index].SetActive(false);
                    UnusedBlockQueue_.Enqueue(BlockModels_[index]);
                    BlockModels_[index] = null;
                }
                block.Reset();
            }

            block.bIsInUpdateList = false;
            block.iNeighbors = 0;
        }

        UpdateBlocks_.Clear();
    }

    /// <summary>
    /// Activate or create a GameObject for a visible cell. Uses object pooling.
    /// </summary>
    void UseBlock(int index)
    {
        if (BlockModels_[index] == null)
        {
            BlockModels_[index] = UnusedBlockQueue_.Count > 0
                ? UnusedBlockQueue_.Dequeue()
                : Instantiate(BlockModel);

            BlockModels_[index].transform.SetParent(transform);
            GetCoordsOut(index, out int x, out int y, out int z);
            BlockModels_[index].transform.position = new Vector3(x * fBlockSize_, y * fBlockSize_, z * fBlockSize_);
            BlockModels_[index].GetComponent<Renderer>().material.color = new Color(
                x / (float)iXMax_,
                y / (float)iYMax_,
                z / (float)iZMax_
            );
        }
        BlockModels_[index].SetActive(true);
    }

    /// <summary>
    /// Increment neighbor count for all 26 adjacent cells (3x3x3 cube minus center).
    /// Each neighbor is added to the update list for rule evaluation.
    /// </summary>
    void RunRule(int index)
    {
        GetCoordsOut(index, out int x, out int y, out int z);

        // 8 corner neighbors
        AddNeighbor(x + 1, y + 1, z + 1);
        AddNeighbor(x - 1, y - 1, z - 1);
        AddNeighbor(x + 1, y + 1, z - 1);
        AddNeighbor(x + 1, y - 1, z + 1);
        AddNeighbor(x - 1, y + 1, z + 1);
        AddNeighbor(x - 1, y - 1, z + 1);
        AddNeighbor(x - 1, y + 1, z - 1);
        AddNeighbor(x + 1, y - 1, z - 1);

        // 12 edge neighbors
        AddNeighbor(x + 1, y + 1, z);
        AddNeighbor(x + 1, y, z + 1);
        AddNeighbor(x, y + 1, z + 1);
        AddNeighbor(x - 1, y - 1, z);
        AddNeighbor(x - 1, y, z - 1);
        AddNeighbor(x, y - 1, z - 1);
        AddNeighbor(x, y + 1, z - 1);
        AddNeighbor(x - 1, y, z + 1);
        AddNeighbor(x + 1, y - 1, z);
        AddNeighbor(x - 1, y + 1, z);
        AddNeighbor(x + 1, y, z - 1);
        AddNeighbor(x, y - 1, z + 1);

        // 6 face neighbors
        AddNeighbor(x, y, z - 1);
        AddNeighbor(x, y, z + 1);
        AddNeighbor(x, y - 1, z);
        AddNeighbor(x, y + 1, z);
        AddNeighbor(x - 1, y, z);
        AddNeighbor(x + 1, y, z);
    }

    SBlock GetBlock(int x, int y, int z) => GetBlock(CalcBlockIndex(x, y, z));

    SBlock GetBlock(int index)
    {
        if (!IsInRange(index)) return null;
        return BlockMap_[index] ??= new SBlock();
    }

    /// <summary>
    /// Convert 3D coordinates to 1D array index.
    /// </summary>
    int CalcBlockIndex(int x, int y, int z) => x + y * iXMax_ + z * iXMax_ * iYMax_;

    void AddNeighbor(int x, int y, int z)
    {
        if (!IsInRange(x, y, z)) return;

        int index = CalcBlockIndex(x, y, z);
        var block = GetBlock(index);
        block.iNeighbors++;

        if (!block.bIsInUpdateList)
        {
            UpdateBlocks_.Add(index);
            block.bIsInUpdateList = true;
        }
    }

    /// <summary>
    /// Core rule evaluation: adaptive thresholds based on growth state.
    /// Growth phase favors expansion, decay phase favors contraction.
    /// </summary>
    bool IsOn(bool wasActive, int neighbors)
    {
        if (wasActive)
        {
            return iGrowthState_ < 0 ? (neighbors >= 7 && neighbors <= 13)
                 : iGrowthState_ > 0 ? (neighbors >= 3 && neighbors <= 15)
                 : (neighbors >= 4 && neighbors <= 14);
        }
        return iGrowthState_ < 0 ? neighbors >= 12
             : iGrowthState_ > 0 ? neighbors >= 9
             : neighbors >= 11;
    }

    bool IsInRange(int index) => index >= 0 && index < iMaxIndex_;

    bool IsInRange(int x, int y, int z) =>
        x >= 0 && y >= 0 && z >= 0 &&
        x < iXMax_ && y < iYMax_ && z < iZMax_;

    /// <summary>
    /// Extract 3D coordinates from 1D array index.
    /// </summary>
    void GetCoordsOut(int index, out int x, out int y, out int z)
    {
        if (!IsInRange(index))
        {
            x = y = z = -1;
            return;
        }

        int zMult = iXMax_ * iYMax_;
        z = index / zMult;
        int yMult = iXMax_;
        y = (index - z * zMult) / yMult;
        x = index - y * yMult - z * zMult;

        if (!IsInRange(x, y, z))
            x = y = z = -1;
    }

    Vector3 GetPositionFromCoords(int x, int y, int z) =>
        new Vector3(x * fBlockSize_, y * fBlockSize_, z * fBlockSize_);
}
