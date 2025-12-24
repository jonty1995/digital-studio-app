import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CustomerInfo } from "./CustomerInfo";
import { PaymentMode } from "./PaymentMode";
import { ImageUpload } from "./ImageUpload";
import { PhotoItemForm } from "./PhotoItemForm";


export function PhotoOrderModal({ isOpen, onClose, onSave, instanceId }) {
    const [customer, setCustomer] = useState({ mobile: '', name: '', id: '' });
    const [items, setItems] = useState([]);
    const [description, setDescription] = useState("");
    const [payment, setPayment] = useState({ mode: 'Cash', total: 0, discount: 0, advance: 0 });
    const [image, setImage] = useState(null);

    const handleSearchCustomer = () => {
        // Mock search
        if (customer.mobile === '9999999999') {
            setCustomer({ ...customer, name: 'Existing User', id: 'CUST001' })
        } else {
            alert("Customer not found (Mock)");
        }
    }

    const handleSave = () => {
        // Basic validation
        if (!customer.mobile) {
            alert("Mobile number is required");
            return;
        }

        const newOrder = {
            customer,
            items,
            description,
            payment,
            image
        };
        onSave(newOrder);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Photo Order" className="max-w-4xl h-[90vh] flex flex-col p-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <CustomerInfo
                            customer={customer}
                            setCustomer={setCustomer}
                            onSearch={handleSearchCustomer}
                            instanceId={instanceId}
                        />
                        <ImageUpload
                            image={image}
                            onUpload={setImage}
                            onRemove={() => setImage(null)}
                            photoId={customer.id ? `IMG_${customer.id}` : null}
                        />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <PhotoItemForm
                            items={items}
                            setItems={setItems}
                            description={description}
                            setDescription={setDescription}
                        />
                        <PaymentMode
                            payment={payment}
                            setPayment={setPayment}
                        />
                    </div>
                </div>
            </div>

            <div className="border-t p-4 flex justify-end gap-2 bg-muted/50 rounded-b-lg">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave}>Save Order</Button>
            </div>
        </Modal>
    );
}
