using UnityEngine;

/// <summary>
/// Camera controller with keyboard input for orbit, movement, and simulation control.
/// </summary>
public class CameraMove : MonoBehaviour
{
    GameOfLifeMap gameOfLifeMap;
    GameOfLifeMap GameOfLifeMap_ => gameOfLifeMap ??= FindObjectOfType<GameOfLifeMap>();

    Vector3 center;

    void Update()
    {
        // Orbit controls
        if (Input.GetKey(KeyCode.A))
            transform.RotateAround(center, Vector3.up, Time.deltaTime * 60f);
        if (Input.GetKey(KeyCode.D))
            transform.RotateAround(center, Vector3.up, -Time.deltaTime * 60f);

        // Movement controls
        if (Input.GetKey(KeyCode.W))
            transform.Translate(Vector3.forward * Time.deltaTime * 10f);
        if (Input.GetKey(KeyCode.S))
            transform.Translate(-Vector3.forward * Time.deltaTime * 10f);

        // Simulation controls
        if (Input.GetKeyDown(KeyCode.R))
            GameOfLifeMap_.ResetGame();
        if (Input.GetKeyDown(KeyCode.O))
            GameOfLifeMap_.ChangeMapSize(-1);
        if (Input.GetKeyDown(KeyCode.P))
            GameOfLifeMap_.ChangeMapSize(1);
        if (Input.GetKeyDown(KeyCode.KeypadPlus))
            GameOfLifeMap_.ChangeRadius(1);
        if (Input.GetKeyDown(KeyCode.KeypadMinus))
            GameOfLifeMap_.ChangeRadius(-1);
    }

    public void SetCenter(Vector3 position)
    {
        center = position;
    }
}
