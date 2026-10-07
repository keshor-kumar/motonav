import pg from "pg";
import { CodeTakenError, type LocationFix, type NewRide, type Store } from "./store.js";
import type { Member, MemberConnection, Ride } from "./types.js";

const iso = (v: Date | string | null): string => (v instanceof Date ? v.toISOString() : v ?? new Date().toISOString());

/* eslint-disable @typescript-eslint/no-explicit-any */
const toRide = (r: any): Ride => ({
  id: r.id,
  rideCode: r.ride_code,
  rideName: r.ride_name,
  destination: r.destination,
  destinationLatitude: r.destination_latitude,
  destinationLongitude: r.destination_longitude,
  createdBy: r.created_by,
  createdAt: iso(r.created_at),
  status: r.status,
  endedAt: r.ended_at ? iso(r.ended_at) : null,
});

const toMember = (m: any): Member => ({
  rideId: m.ride_id,
  userId: m.user_id,
  name: m.name,
  latitude: m.latitude,
  longitude: m.longitude,
  heading: m.heading,
  speed: m.speed,
  lastUpdated: iso(m.last_updated),
  connectionStatus: m.connection_status,
  joinedAt: iso(m.joined_at),
});

export function createPool(databaseUrl: string, isProduction: boolean): pg.Pool {
  return new pg.Pool({
    connectionString: databaseUrl,
    ssl: isProduction || /supabase\.(co|com)/.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
  });
}

export class PgStore implements Store {
  constructor(private readonly pool: pg.Pool) {}

  async createRide(ride: NewRide, creatorId: string, creatorName: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO riders (id, name) VALUES ($1, $2)", [creatorId, creatorName]);
      const r = await client.query(
        `INSERT INTO rides (id, ride_code, ride_name, destination, destination_latitude, destination_longitude, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [ride.id, ride.rideCode, ride.rideName, ride.destination, ride.destinationLatitude, ride.destinationLongitude, creatorId]
      );
      const m = await client.query(
        `INSERT INTO ride_members (ride_id, user_id, name) VALUES ($1,$2,$3) RETURNING *`,
        [ride.id, creatorId, creatorName]
      );
      await client.query("COMMIT");
      return { ride: toRide(r.rows[0]), member: toMember(m.rows[0]) };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      if ((err as { code?: string }).code === "23505") throw new CodeTakenError();
      throw err;
    } finally {
      client.release();
    }
  }

  async getRideByCode(code: string) {
    const r = await this.pool.query("SELECT * FROM rides WHERE ride_code = $1", [code]);
    return r.rows[0] ? toRide(r.rows[0]) : null;
  }
  async getRideById(id: string) {
    const r = await this.pool.query("SELECT * FROM rides WHERE id = $1", [id]);
    return r.rows[0] ? toRide(r.rows[0]) : null;
  }
  async listMembers(rideId: string) {
    const r = await this.pool.query(
      "SELECT * FROM ride_members WHERE ride_id = $1 AND connection_status <> 'left' ORDER BY joined_at",
      [rideId]
    );
    return r.rows.map(toMember);
  }
  async getMember(rideId: string, riderId: string) {
    const r = await this.pool.query("SELECT * FROM ride_members WHERE ride_id = $1 AND user_id = $2", [rideId, riderId]);
    return r.rows[0] ? toMember(r.rows[0]) : null;
  }
  async addMember(rideId: string, riderId: string, name: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO riders (id, name) VALUES ($1, $2)", [riderId, name]);
      const m = await client.query(
        "INSERT INTO ride_members (ride_id, user_id, name) VALUES ($1,$2,$3) RETURNING *",
        [rideId, riderId, name]
      );
      await client.query("COMMIT");
      return toMember(m.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateLocation(rideId: string, riderId: string, fix: LocationFix) {
    const r = await this.pool.query(
      `UPDATE ride_members m
          SET latitude = $3, longitude = $4, heading = $5, speed = $6,
              last_updated = now(), connection_status = 'connected'
         FROM rides r
        WHERE m.ride_id = r.id AND r.status = 'active'
          AND m.ride_id = $1 AND m.user_id = $2 AND m.connection_status <> 'left'
        RETURNING m.*`,
      [rideId, riderId, fix.latitude, fix.longitude, fix.heading, fix.speed]
    );
    return r.rows[0] ? toMember(r.rows[0]) : null;
  }

  async setConnection(rideId: string, riderId: string, status: MemberConnection) {
    const r = await this.pool.query(
      `UPDATE ride_members SET connection_status = $3, last_updated = now()
        WHERE ride_id = $1 AND user_id = $2 AND connection_status <> 'left' RETURNING *`,
      [rideId, riderId, status]
    );
    return r.rows[0] ? toMember(r.rows[0]) : null;
  }

  async markLeft(rideId: string, riderId: string) {
    await this.pool.query(
      `UPDATE ride_members
          SET connection_status = 'left', latitude = NULL, longitude = NULL, heading = NULL, speed = NULL, last_updated = now()
        WHERE ride_id = $1 AND user_id = $2`,
      [rideId, riderId]
    );
  }

  async endRide(rideId: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const r = await client.query("UPDATE rides SET status = 'ended', ended_at = now() WHERE id = $1 RETURNING *", [rideId]);
      await client.query(
        `UPDATE ride_members
            SET latitude = NULL, longitude = NULL, heading = NULL, speed = NULL,
                connection_status = CASE WHEN connection_status = 'left' THEN 'left' ELSE 'disconnected' END
          WHERE ride_id = $1`,
        [rideId]
      );
      await client.query("COMMIT");
      return toRide(r.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }
}
