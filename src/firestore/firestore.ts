import { CRUD } from '../core'

export function firestoreCRUD<Readable, Writable = Readable>(
  adminDb: FirebaseFirestore.Firestore
): CRUD<Readable, Writable> {
  return {
    async find({ table, id }) {
      const docRef = adminDb.collection(table).doc(id)
      const docSnap = await docRef.get()
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() } as Readable
      }
      throw new Error(`Record not found in ${table} with id ${id}`)
    },
    async list({ table, query: q }) {
      let queryRef: FirebaseFirestore.Query = adminDb.collection(table)

      if (q) {
        for (const [key, value] of Object.entries(q)) {
            queryRef = queryRef.where(key, '==', value)
        }
      }

      const querySnapshot = await queryRef.get()
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Readable))
    },
    async create({ table, data }) {
      const docRef = await adminDb.collection(table).add(data as any)
      return { id: docRef.id, ...data } as Readable
    },
    async update({ table, id, data }) {
      const docRef = adminDb.collection(table).doc(id)
      await docRef.update(data as any)
      const updatedDoc = await docRef.get()
      return { id: updatedDoc.id, ...updatedDoc.data() } as Readable
    },
    async remove({ table, id }) {
      const docRef = adminDb.collection(table).doc(id)
      const docSnap = await docRef.get()
      if (!docSnap.exists) {
        throw new Error(`Record not found in ${table} with id ${id}`)
      }
      const data = { id: docSnap.id, ...docSnap.data() } as Readable
      await docRef.delete()
      console.log(`[FIRESTORE] Record removed from ${table} with id ${id}`);
      return data
    },
  }
}

// Export factory function - users need to provide their own adminDb instance
// Example usage:
// import { adminDb } from '@/lib/firebase-admin'
// export const crud = firestoreCRUD(adminDb)

