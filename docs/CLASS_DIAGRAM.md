# Class Diagram — KU VIN

แผนภาพคลาสเชิงวัตถุ (design model) ของระบบเรียกวิน KU VIN สำหรับวิชา OOP
ออกแบบจากโครงสร้างข้อมูลใน `apps/api/prisma/schema.prisma` และพฤติกรรมใน `apps/api/src/services/`
โดยจัดเป็นคลาสที่มีทั้งข้อมูลและเมธอดของตัวเอง ใช้ inheritance, interface และ composition ตามหลัก OOP

```mermaid
classDiagram
direction TB

%% ---------- บัญชีผู้ใช้ (inheritance) ----------
class Account {
  <<abstract>>
  #String id
  #String fullName
  -String passwordHash
  #DateTime createdAt
  +login(identifier, password) Token
  #verifyPassword(password) Boolean
}

class Member {
  <<abstract>>
  #String phone
  #String fcmToken
  #Boolean isSuspended
  #String suspendedReason
  +receive(notification)
  +triggerSos(location, note) SosAlert
}

class User {
  -String email
  -String studentId
  +requestRide(pickup, destination) ServiceRequest
  +cancelRide(request, reason)
  +payBySlip(request, slipFile)
  +rateTrip(request, score, comment) Rating
  +resetPassword(code, newPassword)
}

class Driver {
  -String vinNumber
  -String promptPayId
  -VerificationStatus verificationStatus
  -Location currentLocation
  -Boolean isOnline
  -Boolean isAvailable
  -DateTime queueJoinedAt
  -Int timeoutCount
  +submitVerification(documents)
  +goOnline()
  +goOffline()
  +updateLocation(location)
  +acceptOffer(request)
  +declineOffer(request)
  +startTrip(request)
  +completeTrip(request)
  +confirmPayment(request, status)
  +ratePassenger(request, score, comment) DriverRating
  +getFinanceSummary(period) FinanceSummary
}

class Admin {
  -String email
  -AdminRole role
  +canManage(area) Boolean
  +approveDriver(driver)
  +rejectDriver(driver, reason)
  +suspend(member, reason)
  +unsuspend(member)
  +resolveDispute(request)
  +resolveSos(alert, note)
}

Account <|-- Member
Account <|-- Admin
Member <|-- User
Member <|-- Driver

%% ---------- รถและรายจ่ายของคนขับ ----------
class Vehicle {
  -String licensePlate
  -String model
  -Float fuelKmPerLiter
  -Float fuelPricePerLiter
  +estimateFuelCost(distanceKm) Float
}

class DriverExpense {
  -ExpenseCategory category
  -Float amount
  -DateTime occurredAt
  -Float liters
  -Float odometerKm
  -String note
}

Driver "1" *-- "1" Vehicle : drives
Driver "1" *-- "0..*" DriverExpense : records

%% ---------- พื้นที่ให้บริการ ----------
class Location {
  +Float lat
  +Float lng
  +distanceTo(other) Float
}

class Area {
  -String slug
  -String name
  -String displayName
  -Location center
  -Float serviceRadiusKm
  -List~EmergencyContact~ emergencyContacts
  -Boolean isActive
  +contains(location) Boolean
  +findForPoint(location)$ Area
}

class FarePolicy {
  -Float flatRadiusKm
  -Float flatFare
  -Float ratePerKm
  -Float minFare
  +calculateFare(pickup, destination, distanceKm) Float
}

class DispatchQueue {
  -Int OFFER_TIMEOUT_SEC = 60
  -Int MAX_TIMEOUTS
  +getNextDriver(excludeIds) Driver
  +dispatch(request)
  +handleResponse(driver, response)
  +sweepExpiredOffers()
}

class Landmark {
  -String name
  -String detail
  -Location location
  -Boolean isPopular
  -Boolean coordsVerified
}

Area "1" *-- "1" FarePolicy : prices with
Area "1" *-- "1" DispatchQueue : runs
Area "1" o-- "0..*" Driver : has
Area "1" o-- "0..*" Landmark : has
Area "0..1" -- "0..*" Admin : managed by
DispatchQueue "1" o-- "0..*" Driver : online drivers (FIFO)

%% ---------- ทริปและการชำระเงิน ----------
class ServiceRequest {
  -ServiceStatus status
  -Location pickup
  -Location destination
  -Boolean isWithinCampus
  -Float distanceKm
  -Float fare
  -DateTime requestedAt
  -DateTime acceptedAt
  -DateTime completedAt
  -String cancelReason
  -DateTime offerExpiresAt
  -List~String~ triedDriverIds
  +accept(driver)
  +start()
  +complete()
  +cancel(actor, reason)
}

class Payment {
  -PaymentMethod method
  -PaymentStatus status
  -String paymentRef
  -DateTime verifiedAt
  -String confirmedBy
  -Int slipAttempts
  -String disputeNote
  +getPromptPayQr() QrCode
  +submitSlip(slipFile)
  +markPaid(confirmedBy)
  +dispute(note)
}

class SlipProvider {
  <<interface>>
  +String name
  +verify(slipFile, expected) SlipResult
}
class EasySlipProvider {
  -String apiKey
  +verify(slipFile, expected) SlipResult
}
class SlipOkProvider {
  -String apiKey
  -String branchId
  +verify(slipFile, expected) SlipResult
}
class MockSlipProvider {
  +verify(slipFile, expected) SlipResult
}

SlipProvider <|.. EasySlipProvider
SlipProvider <|.. SlipOkProvider
SlipProvider <|.. MockSlipProvider

Area "1" -- "0..*" ServiceRequest : serves
User "1" -- "0..*" ServiceRequest : requests
Driver "0..1" -- "0..*" ServiceRequest : serves
ServiceRequest "1" *-- "1" Payment : has
Payment ..> SlipProvider : verifies slip with
DispatchQueue ..> ServiceRequest : offers

%% ---------- รีวิว (inheritance) ----------
class Review {
  <<abstract>>
  #Int score
  #String comment
  #DateTime createdAt
}
class Rating
class DriverRating

Review <|-- Rating
Review <|-- DriverRating
ServiceRequest "1" -- "0..1" Rating : rated by passenger
ServiceRequest "1" -- "0..1" DriverRating : rated by driver
User "1" -- "0..*" Rating : writes
Driver "1" -- "0..*" DriverRating : writes

%% ---------- แจ้งเตือนและเหตุฉุกเฉิน ----------
class Notification {
  -String title
  -String body
  -Boolean isRead
  +markRead()
}

class SosAlert {
  -Location location
  -String note
  -String contactedEmergencyNumber
  -SosStatus status
  -String resolvedNote
  -DateTime resolvedAt
  +markContacted(number)
  +cancel()
  +resolve(note)
}

Member "1" -- "0..*" Notification : receives
Member "1" -- "0..*" SosAlert : raises
Area "0..1" -- "0..*" SosAlert : routed to
SosAlert --> "0..1" ServiceRequest : during trip

%% ---------- enum ----------
class ServiceStatus {
  <<enumeration>>
  PENDING
  ACCEPTED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
class PaymentMethod {
  <<enumeration>>
  CASH
  PROMPTPAY
}
class PaymentStatus {
  <<enumeration>>
  PENDING
  PAID
  DISPUTED
}
class VerificationStatus {
  <<enumeration>>
  PENDING
  APPROVED
  REJECTED
}
class AdminRole {
  <<enumeration>>
  SUPER_ADMIN
  AREA_ADMIN
}
class ExpenseCategory {
  <<enumeration>>
  FUEL
  TIRE
  ENGINE_OIL
  MAINTENANCE
  REPAIR
  OTHER
}
class SosStatus {
  <<enumeration>>
  OPEN
  RESOLVED
}
```

## หลัก OOP ที่ใช้ในแผนภาพ

| หลัก | ตรงไหนในแผนภาพ |
|---|---|
| Inheritance | `Account` → `Member` / `Admin`, `Member` → `User` / `Driver`, `Review` → `Rating` / `DriverRating` |
| Abstraction | `Account`, `Member`, `Review` เป็น abstract class ไม่สร้าง object ตรง ๆ |
| Interface + Polymorphism | `SlipProvider` มี 3 implementation เลือกตอนรันตาม `SLIP_PROVIDER` และ `Payment` เรียก `verify()` โดยไม่ต้องรู้ว่าเป็นเจ้าไหน |
| Encapsulation | attribute เป็น `-` private / `#` protected ส่วน `passwordHash` เข้าถึงผ่าน `verifyPassword()` เท่านั้น |
| Composition | `Driver` *— `Vehicle`, `DriverExpense` · `Area` *— `FarePolicy`, `DispatchQueue` · `ServiceRequest` *— `Payment` |
| Aggregation | `Area` o— `Driver`, `Landmark` · `DispatchQueue` o— `Driver` (คนขับออกจากคิวได้แต่ยังอยู่ในระบบ) |
| Static method | `Area.findForPoint()` (ขีดเส้นใต้) หาพื้นที่จากพิกัดจุดรับ |

## ความสัมพันธ์กับโค้ดจริง

แผนภาพนี้เป็น design model โค้ดจริงเขียนด้วย JavaScript แบบ service function + Prisma จึงต่างจากแผนภาพในบางจุด

| ในแผนภาพ | ในโค้ด |
|---|---|
| `Account`, `Member` | ฟิลด์ที่ซ้ำกันใน model `User`, `Driver`, `Admin` (`fullName`, `passwordHash`, `isSuspended` ฯลฯ) |
| `Member` ที่รับ `Notification` / กด `SosAlert` | `recipientType` + `recipientId` และ `actorType` + `actorId` (enum `NotificationRecipient` = USER/DRIVER) |
| `Vehicle` | ฟิลด์ `licensePlate`, `vehicleModel`, `fuelKmPerLiter`, `fuelPricePerLiter` ใน `Driver` + `finance.service.js` |
| `FarePolicy` | ฟิลด์ `flatFare`, `ratePerKm`, `minFare`, `flatRadiusKm` ใน `Area` + `estimateFare()` |
| `DispatchQueue` | `queue.service.js` (`getNextDriverInQueue`, `dispatchRequest`, `handleDriverResponse`, `sweepExpiredOffers`) |
| `Payment` | ฟิลด์ `payment*` ใน `ServiceRequest` + `payment.service.js` |
| `SlipProvider` และ 3 คลาสลูก | `services/slip/` — object ที่มี `name` และ `verify()` เลือกใน `slip/index.js` |
| `Location` | คู่ `lat`/`lng` ที่ใช้ทุก model |
| `Review` | `Rating` กับ `DriverRating` มีฟิลด์ `score`, `comment`, `createdAt` เหมือนกัน |
