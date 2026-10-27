import { expect, it } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

it("refreshes cached photos without losing uncached galleries or photos", async () => {
  const root = await mkdtemp(join(tmpdir(), "kris-photo-meta-"));
  const output = join(root, "src/content/photos.meta.json");
  const cached = join(root, ".cache/photos/current");
  const entry = {
    caption: "Existing caption",
    scene: "mountain",
    score: 80,
    tags: ["landscape"],
  };
  const update = { ...entry, caption: "Updated caption", uuid: "cached-photo" };

  try {
    await mkdir(join(root, "src/content"), { recursive: true });
    await mkdir(cached, { recursive: true });
    await writeFile(
      output,
      JSON.stringify({ archived: { "01": entry }, current: { "02": entry } })
    );
    await writeFile(
      join(cached, "placed.json"),
      JSON.stringify(["cached-photo", "uncached-photo"])
    );
    await writeFile(join(cached, "scored.json"), JSON.stringify([update]));

    const run = Bun.spawn([process.execPath, join(import.meta.dir, "meta.ts")], {
      cwd: root,
      stderr: "pipe",
      stdout: "ignore",
    });
    const stderr = await new Response(run.stderr).text();
    expect(stderr).toBe("");
    expect(await run.exited).toBe(0);

    expect(JSON.parse(await readFile(output, "utf-8"))).toEqual({
      archived: { "01": entry },
      current: {
        "01": { ...entry, caption: "Updated caption" },
        "02": entry,
      },
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
