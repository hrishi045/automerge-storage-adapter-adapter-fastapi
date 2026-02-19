// This storage adapter relies on an API backend and does not work on its own
// I'd also recommend never doing something like this unless you're experimenting in building applications that are deliberately slow
// This is just an experiment. I'm aware it increases latency greatly. But for an application where I value read-write stability over performance, it works fine.
// If you're running your application on a stateless docker container, this is a good option for you.

import { StorageAdapterInterface, Chunk, StorageKey } from "@automerge/automerge-repo";

export class HttpApiStorageAdapterAdapter implements StorageAdapterInterface {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, ""); // Remove trailing slashes
  }

  private buildUrl(endpoint: string, key: StorageKey): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    key.forEach((part) => url.searchParams.append("key", part));
    return url.toString();
  }

  async load(key: StorageKey): Promise<Uint8Array | undefined> {
    const url = this.buildUrl("/storage/item", key);
    const response = await fetch(url);

    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  async save(key: StorageKey, data: Uint8Array): Promise<void> {
    const url = this.buildUrl("/storage/item", key);
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: data,
    });

    if (!response.ok) {
      throw new Error(`Failed to save data: ${response.statusText}`);
    }
  }

  async remove(key: StorageKey): Promise<void> {
    const url = this.buildUrl("/storage/item", key);
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to remove data: ${response.statusText}`);
    }
  }

  async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    const url = this.buildUrl("/storage/range", keyPrefix);
    console.log(url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load range: ${response.statusText}`);
    }

    const items = await response.json();

    return items.map((item: { key: string; data: string }) => {
      const binaryString = atob(item.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return {
        key: item.key,
        data: bytes,
      };
    });
  }

  async removeRange(keyPrefix: StorageKey): Promise<void> {
    const url = this.buildUrl("/storage/range", keyPrefix);
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to remove range: ${response.statusText}`);
    }
  }
}
